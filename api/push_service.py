from firebase_admin import messaging
from core.models import Device, NotificationLog, Provider
from django.db.models import Q
import re

def send_push_notification_core(provider_id, title, message, data=None, source='system', target_customer_id=None, segment_type='all', segment_tags=None, segment_search=None):
    """
    SERVIÇO CENTRAL DE ENVIO DE PUSH (FCM V1 via Firebase Admin)
    ------------------------------------------------------------
    Regra de Ouro: O provider_id é obrigatório e filtra estritamente os dispositivos.
    target_customer_id: Opcional. Se informado, envia APENAS para o usuário com este CPF ou ID Externo.
    """
    if not provider_id:
        raise ValueError("FATAL: provider_id é obrigatório para envio de push.")

    query = Device.objects.filter(
        provider_id=provider_id, 
        active=True
    ).exclude(push_token__isnull=True).exclude(push_token='')

    if target_customer_id:
        query = query.filter(
            Q(user__cpf=target_customer_id) | 
            Q(user__external_id=target_customer_id) |
            Q(user__customer_id=target_customer_id)
        )

    if segment_type == 'active':
        query = query.filter(user__active=True)
    elif segment_type == 'inactive':
        query = query.filter(user__active=False)
    elif segment_type == 'tags' and segment_tags:
        tags_list = [t.strip() for t in str(segment_tags).split(',') if t.strip()]
        if tags_list:
            tags_q = Q()
            for tag in tags_list:
                tags_q |= Q(user__tags__icontains=tag)
            query = query.filter(tags_q)

    if segment_search:
        text = str(segment_search).strip()
        if text:
            digits = re.sub(r'\D', '', text)
            search_q = Q(user__name__icontains=text) | Q(user__email__icontains=text)
            if digits:
                search_q |= Q(user__cpf__icontains=digits) | Q(user__customer_id__icontains=digits) | Q(user__external_id__icontains=digits)
            else:
                search_q |= Q(user__customer_id__icontains=text) | Q(user__external_id__icontains=text)
            query = query.filter(search_q)

    devices = query
    tokens = list(devices.values_list('push_token', flat=True).distinct())

    if not tokens:
        # Debug detalhado para entender por que não encontrou
        total_devices = Device.objects.filter(provider_id=provider_id, active=True).count()
        print(f"[{source}] Nenhum token válido encontrado para Provider {provider_id} (Target: {target_customer_id}). Dispositivos ativos totais: {total_devices}")
        return {'status': 'skipped', 'reason': 'no_devices_found'}

    # 2. Prepara Mensagem Multicast
    # O FCM suporta até 500 tokens por envio multicast.
    # Vamos fazer em lotes de 500.
    
    success_count = 0
    failure_count = 0
    
    batch_size = 500
    for i in range(0, len(tokens), batch_size):
        batch_tokens = tokens[i:i + batch_size]
        
        try:
            # Nota: 'data' valores devem ser strings
            formatted_data = {k: str(v) for k, v in (data or {}).items()}
            
            message_payload = messaging.MulticastMessage(
                tokens=batch_tokens,
                notification=messaging.Notification(
                    title=title,
                    body=message,
                ),
                data=formatted_data
            )
            
            response = messaging.send_each_for_multicast(message_payload)
            
            success_count += response.success_count
            failure_count += response.failure_count
            
            # Tratamento de erros (tokens inválidos)
            if response.failure_count > 0:
                for idx, resp in enumerate(response.responses):
                    if not resp.success:
                        error_code = resp.exception.code if resp.exception else 'unknown'
                        # Se o token não existe mais (app desinstalado ou token expirado)
                        if error_code in ['NOT_FOUND', 'registration-token-not-registered', 'invalid-registration-token']:
                            invalid_token = batch_tokens[idx]
                            print(f"Token inválido removido: {invalid_token[:10]}... (Erro: {error_code})")
                            Device.objects.filter(push_token=invalid_token).delete()
                        else:
                             print(f"Falha envio token: {resp.exception}")

        except Exception as e:
            print(f"Erro CRÍTICO no envio de lote FCM: {e}")
            failure_count += len(batch_tokens)

    # 3. Auditoria (Log Obrigatório)
    try:
        NotificationLog.objects.create(
            provider_id=provider_id,
            source=source,
            title=title,
            body=message,
            recipients_count=len(tokens),
            success_count=success_count,
            failure_count=failure_count
        )
    except Exception as e:
        print(f"CRÍTICO: Falha ao salvar log de notificação: {e}")

    return {
        'status': 'completed',
        'provider_id': provider_id,
        'sent': success_count,
        'failed': failure_count
    }
