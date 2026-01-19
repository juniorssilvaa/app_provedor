from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from django.views.decorators.csrf import csrf_exempt
from core.models import Device, Provider, AppUser
from .push_service import send_push_notification_core
from django.utils import timezone
import logging
import re

logger = logging.getLogger(__name__)

# --------------------------------------------------
# 2) REGISTRO DE DISPOSITIVO (POST /devices/register/)
# --------------------------------------------------
@extend_schema(
    tags=['Push'],
    summary="Registrar dispositivo para Push",
    description="Vincula um token de notificação (FCM/Expo) a um usuário para permitir o envio de notificações.",
    request=inline_serializer(
        name='RegisterDeviceRequest',
        fields={
            'provider_token': serializers.CharField(help_text="Token sk_live_... do provedor"),
            'push_token': serializers.CharField(help_text="Token de notificação"),
            'platform': serializers.ChoiceField(choices=['android', 'ios']),
            'cpf': serializers.CharField(required=False, help_text="CPF do usuário para vínculo"),
            'user_id': serializers.IntegerField(required=False, help_text="ID do usuário para vínculo")
        }
    )
)
@api_view(['POST'])
@permission_classes([AllowAny])
def register_device(request):
    """
    Registra ou atualiza um dispositivo para notificações Push.
    Obrigatório: provider_token (Não confia em provider_id do body).
    """
    try:
        data = request.data
        user = request.user
        
        provider_token = data.get('provider_token')
        provider = None

        # 1. Resolve Provider via Token (Obrigatório para Apps)
        if provider_token:
            from core.models import ProviderToken
            token_obj = ProviderToken.objects.filter(token=provider_token, is_active=True).first()
            if token_obj:
                provider = token_obj.provider
            else:
                return Response({'error': 'Token de provedor inválido ou inativo.'}, status=403)
        
        # 2. Fallback para usuário autenticado (Painel Web)
        if not provider and user.is_authenticated:
            provider = getattr(user, 'provider', None)

        if not provider:
            return Response({'error': 'provider_token é obrigatório.'}, status=400)

        fcm_token = data.get('fcm_token') or data.get('push_token')
        platform = data.get('platform', 'unknown')
        device_info = data.get('device', {})
        
        if not fcm_token:
            return Response({'error': 'fcm_token é obrigatório.'}, status=400)

        # Resolve AppUser antecipadamente
        app_user = None
        
        # Se o usuário estiver logado no app (AppUser)
        if isinstance(user, AppUser):
            app_user = user
        else:
            # Tenta buscar AppUser pelo CPF ou user_id dentro do provider resolvido
            user_id = data.get('user_id')
            cpf_recebido = data.get('cpf')
            
            if user_id:
                app_user = AppUser.objects.filter(id=user_id, provider=provider).first()
            
            if not app_user and cpf_recebido:
                import re
                cpf_limpo = re.sub(r'\D', '', str(cpf_recebido))
                app_user = AppUser.objects.filter(cpf=cpf_limpo, provider=provider).first()

        existing_device = Device.objects.filter(push_token=fcm_token).first()
        
        if existing_device:
            # Se o token já existe, garante que ele pertence ao provider resolvido pelo token atual
            if existing_device.provider_id != provider.id:
                existing_device.provider = provider
            
            if app_user:
                existing_device.user = app_user
            
            existing_device.last_active = timezone.now()
            existing_device.save()
        else:
            # Cria novo (Exige AppUser)
            if not app_user:
                 return Response({'error': 'Usuário (AppUser) não identificado para este provedor. Envie CPF.'}, status=400)

            Device.objects.create(
                provider=provider,
                user=app_user,
                push_token=fcm_token,
                platform=platform,
                model=device_info.get('model', 'Unknown'),
                os_version=device_info.get('version', 'Unknown'),
                active=True,
                last_active=timezone.now()
            )

        return Response({
            'message': 'Dispositivo registrado com sucesso.',
            'provider': provider.name
        })

    except Exception as e:
        logger.error(f"Erro register_device: {e}")
        return Response({'error': str(e)}, status=500)

    except Exception as e:
        logger.error(f"Erro register_device: {e}")
        return Response({'error': str(e)}, status=500)


# --------------------------------------------------
# 5) WEBHOOK DO SGP (POST /webhooks/sgp/)
# --------------------------------------------------
@extend_schema(tags=['Push'])
@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
def sgp_webhook(request):
    """
    Recebe gatilhos do SGP para envio de Push.
    Suporta POST (JSON Body) e GET (Query Params - Fallback).
    """
    try:
        # Tenta pegar do Body (POST) ou Query Params (GET)
        # MELHORIA: Merge de POST Data + Query Params
        data = {}
        
        # 1. Tenta pegar Query Params (URL) primeiro
        data = request.GET.dict()
        
        # 2. Se for POST, tenta pegar Body e mesclar
        if request.method == 'POST':
            if request.data:
                # Se for QueryDict (form-data)
                if hasattr(request.data, 'dict'):
                    data.update(request.data.dict())
                # Se for Dict (JSON)
                elif isinstance(request.data, dict):
                    data.update(request.data)
                # Se for Lista ou outro, ignora o body e usa só URL
        
        # LOG EDUCACIONAL PARA DEBUG
        print(f"DEBUG SGP WEBHOOK: Method={request.method}, Data={data}")

        # DETECÇÃO DE PROBLEMA DE REDIRECT (SLASH)
        # Se o SGP diz que é POST (via query param), mas o Django recebeu GET,
        # é quase certeza que faltou a barra '/' no final da URL no SGP.
        if request.method == 'GET' and (data.get('method') == 'POST' or data.get('do_post') == 'true'):
            print("\n" + "="*60)
            print("🚨 ALERTA DE CONFIGURAÇÃO SGP 🚨")
            print("O SGP está tentando fazer um POST, mas chegou como GET.")
            print("MOTIVO PROVÁVEL: Faltou a barra '/' no final da URL.")
            print("CORREÇÃO: Mude '.../sgp?provider_token=...' para '.../sgp/?provider_token=...'")
            print("CONSEQUÊNCIA: O JSON (Corpo) foi perdido. O Título será o padrão.")
            print("="*60 + "\n")

        # Busca Token (Prioridade: Body > Query String)
        provider_token = data.get('provider_token')
        if not provider_token and request.method == 'GET':
             provider_token = request.query_params.get('provider_token')

        if not provider_token:
            return Response({'error': 'provider_token obrigatório.'}, status=401)
            
        # Busca provedor pelo token (Segurança Forte)
        from core.models import ProviderToken
        provider = None
        
        # 1. Tenta buscar no novo modelo ProviderToken
        token_obj = ProviderToken.objects.filter(token=provider_token, is_active=True).first()
        if token_obj:
            provider = token_obj.provider
        else:
            # 2. Fallback para sgp_token legado no modelo Provider
            provider = Provider.objects.filter(sgp_token=provider_token, is_active=True).first()
            
        if not provider:
            return Response({'error': 'Token inválido ou provedor inativo.'}, status=403)
            
        # Extrai dados da mensagem (Suporte a Payload SGP Nested, Flat e SMS Gateway)
        # Tenta extrair de 'data' (Nested) ou da raiz (Flat)
        nested_data = data.get('data')
        if not isinstance(nested_data, dict):
            nested_data = {}
        
        # Validação do provider_id (se fornecido, deve corresponder ao provider do token)
        provider_id_recebido = data.get('provider_id') or nested_data.get('provider_id')
        if provider_id_recebido:
            try:
                provider_id_int = int(provider_id_recebido)
                if provider_id_int != provider.id:
                    return Response({
                        'error': f'provider_id ({provider_id_int}) não corresponde ao provider do token ({provider.id}).'
                    }, status=403)
            except (ValueError, TypeError):
                return Response({
                    'error': 'provider_id inválido. Deve ser um número.'
                }, status=400)

        # 1. Extração de TÍTULO (Busca em todos os lugares possíveis)
        titulo_recebido = (
            nested_data.get('message_title') or 
            nested_data.get('title') or 
            nested_data.get('titulo') or 
            data.get('message_title') or 
            data.get('title') or 
            data.get('titulo')
        )
        
        if titulo_recebido:
            titulo = titulo_recebido
        else:
            print("AVISO: Nenhum título encontrado na requisição. Usando padrão.")
            titulo = "Nova Mensagem"

        # 2. Extração de MENSAGEM (também usada para tentar descobrir o contrato)
        mensagem = (
            nested_data.get('message_body') or
            nested_data.get('message') or
            nested_data.get('mensagem') or
            nested_data.get('msg') or
            data.get('message_body') or
            data.get('message') or
            data.get('mensagem') or
            data.get('msg')
        )

        # 3. Extração de CLIENTE / CONTRATO (Para filtrar envio)
        # Regra: se NÃO vier nenhum identificador, NÃO deve enviar para todos os clientes.
        raw_customer_id = (
            nested_data.get('customer_id') or 
            data.get('customer_id') or 
            nested_data.get('customerId') or 
            data.get('customerId') or 
            nested_data.get('cpf') or 
            data.get('cpf') or 
            nested_data.get('cpf_cnpj') or 
            data.get('cpf_cnpj')
        )

        # Suporte a contratoId/contract_id/idcontrato vindo do SGP (URL/JSON)
        contract_id = (
            nested_data.get('contract_id') or 
            data.get('contract_id') or 
            nested_data.get('contrato_id') or 
            data.get('contrato_id') or 
            nested_data.get('contratoId') or 
            data.get('contratoId') or
            nested_data.get('idcontrato') or
            data.get('idcontrato')
        )

        # Fallback: tenta extrair "Contrato: 37" de dentro da própria mensagem
        if not contract_id and mensagem:
            match = re.search(r'Contrato:\s*(\d+)', str(mensagem), re.IGNORECASE)
            if match:
                contract_id = match.group(1)

        # Identificador final usado para filtrar os dispositivos (CPF/customer_id ou contrato)
        customer_id = raw_customer_id or contract_id

        # 4. Extração de LINK e TIPO
        link = nested_data.get('link') or nested_data.get('url') or data.get('link') or data.get('url')
        tipo = nested_data.get('type') or data.get('tipo') or 'info'
        
        # LIMPEZA CRÍTICA: Se a mensagem contiver erro de HTTPSConnectionPool,
        # tenta extrair a mensagem real escondida dentro dela ou rejeita.
        if mensagem and "HTTPSConnectionPool" in mensagem:
            import urllib.parse
            
            # Tenta achar 'msg=' dentro da string de erro
            if "msg=" in mensagem:
                try:
                    # Pega o que está depois de msg= e antes de & ou fim da string
                    # Ex: ...&msg=Olá+Mundo&to=...
                    start = mensagem.find("msg=") + 4
                    end = mensagem.find("&", start)
                    if end == -1:
                        real_msg_encoded = mensagem[start:]
                    else:
                        real_msg_encoded = mensagem[start:end]
                    
                    # Decodifica URL (Ol%C3%A1 -> Olá, + -> Espaço)
                    mensagem = urllib.parse.unquote_plus(real_msg_encoded)
                    print(f"RECUPERADO: Mensagem extraída do erro: {mensagem}")
                except Exception as e:
                    print(f"FALHA ao extrair mensagem do erro: {e}")
                    return Response({'error': 'Erro no gateway de origem (Loop de Erro).'}, status=400)
            else:
                # Se não conseguir extrair, rejeita para não mandar lixo para o cliente
                return Response({'error': 'Mensagem contém stacktrace de erro do SGP.'}, status=400)

        # Segurança: Se não vier nenhum identificador, não envia para todos os clientes
        if not customer_id:
            return Response(
                {
                    'error': 'Identificador obrigatório (idcontrato, contract_id, customer_id, cpf ou cpf_cnpj). '
                             'Notificação NÃO foi enviada para todos para evitar spam.',
                    'hint': 'No SGP, use a variável {idcontrato}. Ex.: "Contrato: {idcontrato}" na mensagem ou envie idcontrato={{idcontrato}}/contract_id={{idcontrato}} na URL/JSON.'
                },
                status=400
            )

        # Log de dados finais extraídos
        print(f"DEBUG: Dados Extraídos -> Título: {titulo}, Msg: {mensagem}, Link: {link}, Customer: {customer_id}, ContractId: {contract_id}")

        if not mensagem:
            return Response({'error': 'Mensagem obrigatória (message_body, mensagem ou msg).'}, status=400)

        # Monta Payload
        extra_data = {
            'type': tipo,
            'url': link,
            'click_action': link # Android standard
        }
        
        # Dispara Serviço Central
        result = send_push_notification_core(
            provider_id=provider.id,
            title=titulo,
            message=mensagem,
            data=extra_data,
            source='sgp_webhook',
            target_customer_id=customer_id
        )
        
        return Response(result)

    except Exception as e:
        logger.error(f"Erro sgp_webhook: {e}")
        return Response({'error': str(e)}, status=500)


# --------------------------------------------------
# 6) ENVIO PELO PAINEL (POST /admin/push/send/)
# --------------------------------------------------
@extend_schema(tags=['Push'])
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_send_push(request):
    """
    Envio manual pelo painel administrativo.
    Restringe envio ao provider do admin logado (se não for superuser).
    """
    try:
        user = request.user
        data = request.data
        
        # Determina Provider ID
        target_provider_id = None
        
        if user.is_superuser:
            target_provider_id = data.get('provider_id')
            if not target_provider_id:
                return Response({'error': 'Superuser deve especificar provider_id.'}, status=400)
        else:
            # Admin Comum: Só pode enviar para o próprio provider
            if not hasattr(user, 'provider') or not user.provider:
                return Response({'error': 'Usuário sem provedor associado.'}, status=403)
            target_provider_id = user.provider.id
            
            # Auditoria: Se tentar enviar para outro, bloqueia
            if data.get('provider_id') and str(data.get('provider_id')) != str(target_provider_id):
                 return Response({'error': 'Você só pode enviar mensagens para seu provedor.'}, status=403)

        title = data.get('title')
        message = data.get('message')
        link = data.get('link')
        
        if not title or not message:
             return Response({'error': 'Título e Mensagem são obrigatórios.'}, status=400)

        result = send_push_notification_core(
            provider_id=target_provider_id,
            title=title,
            message=message,
            data={'url': link, 'type': 'manual'},
            source='admin_panel'
        )
        
        return Response(result)

    except Exception as e:
        logger.error(f"Erro admin_send_push: {e}")
        return Response({'error': str(e)}, status=500)
