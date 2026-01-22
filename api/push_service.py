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
        total_devices = Device.objects.filter(provider_id=provider_id).count()
        active_devices = Device.objects.filter(provider_id=provider_id, active=True).count()
        devices_with_token = Device.objects.filter(provider_id=provider_id).exclude(push_token__isnull=True).exclude(push_token='').count()
        
        print(f"[{source}] Falha no envio: Nenhum dispositivo com token encontrado para Provider {provider_id}.")
        print(f"DEBUG: Total={total_devices}, Ativos={active_devices}, Com Token={devices_with_token}")
        
        return {
            'status': 'skipped', 
            'reason': 'no_devices_found',
            'debug': {
                'total': total_devices,
                'active': active_devices,
                'with_token': devices_with_token
            }
        }

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
                        error_code = 'unknown'
                        error_message = str(resp.exception) if resp.exception else 'unknown error'
                        
                        if resp.exception:
                            # Tenta obter o código do erro
                            if hasattr(resp.exception, 'code'):
                                error_code = resp.exception.code
                            elif hasattr(resp.exception, 'error_code'):
                                error_code = resp.exception.error_code
                            
                            # Verifica se a mensagem contém indicações de token inválido
                            error_str = str(resp.exception).lower()
                            if any(term in error_str for term in ['invalid', 'not registered', 'not found', 'registration token']):
                                error_code = 'invalid-registration-token'
                        
                        # Se o token não existe mais (app desinstalado ou token expirado)
                        invalid_codes = [
                            'NOT_FOUND', 
                            'registration-token-not-registered', 
                            'invalid-registration-token',
                            'INVALID_ARGUMENT'
                        ]
                        
                        if error_code in invalid_codes or 'invalid' in error_message.lower() or 'not registered' in error_message.lower():
                            invalid_token = batch_tokens[idx]
                            try:
                                # Remove apenas os primeiros caracteres para log (segurança)
                                token_preview = invalid_token[:20] + '...' if len(invalid_token) > 20 else invalid_token
                                print(f"Token inválido removido: {token_preview} (Erro: {error_code})")
                                Device.objects.filter(push_token=invalid_token).update(active=False, push_token='')
                            except Exception as cleanup_error:
                                print(f"Erro ao limpar token inválido: {cleanup_error}")
                        else:
                            # Outros tipos de erro (não relacionados a token inválido)
                            print(f"Falha envio token (outro erro): {error_message}")

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
