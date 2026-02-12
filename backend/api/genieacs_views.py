from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer
from rest_framework import serializers
from .genieacs_service import GenieACSService
from core.models import AppUser
from django.utils import timezone

@extend_schema(
    summary="Consultar e Alterar Configuração Wi-Fi (GenieACS)",
    description="Endpoint direto para integração com GenieACS. Permite consultar SSID/Senha atuais e alterar configurações de 2.4GHz e 5GHz.",
    parameters=[
        OpenApiParameter(name='contrato', description='ID do Contrato do Cliente', required=False, type=str, location=OpenApiParameter.QUERY),
    ],
    request=inline_serializer(
        name='WifiConfigRequest',
        fields={
            'contrato': serializers.CharField(required=False, help_text="ID do contrato (se não enviado na URL)"),
            'novo_ssid': serializers.CharField(required=False, help_text="Novo SSID para rede 2.4GHz"),
            'nova_senha': serializers.CharField(required=False, help_text="Nova senha para rede 2.4GHz"),
            'novo_ssid_5ghz': serializers.CharField(required=False, help_text="Novo SSID para rede 5GHz"),
            'nova_senha_5ghz': serializers.CharField(required=False, help_text="Nova senha para rede 5GHz"),
        }
    ),
    responses={
        200: inline_serializer(
            name='WifiConfigResponse',
            fields={
                'ssid': serializers.CharField(),
                'password': serializers.CharField(),
                'ssid_5ghz': serializers.CharField(),
                'password_5ghz': serializers.CharField(),
                'modelo': serializers.CharField(),
                'fabricante': serializers.CharField(),
                'uptime': serializers.CharField(),
                'ip': serializers.CharField(),
                'status': serializers.CharField(),
                'erro': serializers.BooleanField(default=False),
                'mensagem': serializers.CharField(required=False),
            }
        ),
        400: inline_serializer(name='Error400', fields={'erro': serializers.BooleanField(), 'mensagem': serializers.CharField()}),
        404: inline_serializer(name='Error404', fields={'erro': serializers.BooleanField(), 'mensagem': serializers.CharField()}),
        500: inline_serializer(name='Error500', fields={'erro': serializers.BooleanField(), 'mensagem': serializers.CharField()}),
        502: inline_serializer(name='Error502', fields={'erro': serializers.BooleanField(), 'mensagem': serializers.CharField()}),
    }
)
@csrf_exempt
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def wifi_config_api(request):
    contrato = request.GET.get('contrato') or request.data.get('contrato')
    
    if not contrato:
        return Response({'erro': True, 'mensagem': 'Contrato não informado.'}, status=400)

    # 1. Buscar Usuário Localmente (SGP Mirror)
    app_user = AppUser.objects.filter(customer_id=contrato).first()
    if not app_user or not app_user.pppoe_login:
        return Response({'erro': True, 'mensagem': 'Contrato não encontrado ou sem login PPPoE vinculado.'}, status=404)

    service = GenieACSService()
    
    # 2. Buscar Dispositivo no GenieACS via PPPoE ou Cache
    device_id = None
    
    # Tentar usar ID em cache primeiro se existir
    if app_user.genieacs_device_id:
        device_id = app_user.genieacs_device_id
        # Validar se ainda existe? Por enquanto assumimos que sim para ser resiliente.
    
    if not device_id:
        # Se não tem cache, busca no GenieACS
        device_id = service.find_device_by_pppoe(app_user.pppoe_login)
        
        # Se encontrou, salva no cache para próximas vezes
        if device_id:
            app_user.genieacs_device_id = device_id
            app_user.save(update_fields=['genieacs_device_id'])
    
    if not device_id:
        # Tentar uma última vez com busca forçada se não achou (talvez caiu conexão)
        # Mas como já tentamos find_device_by_pppoe, não há muito mais o que fazer.
        return Response({'erro': True, 'mensagem': f'Modem não encontrado para o login {app_user.pppoe_login}.'}, status=404)

    if request.method == 'POST':
        # Se device_id não foi encontrado no passo anterior, já retornamos 404.
        # Agora, validamos se o device_id está REALMENTE acessível apenas se o comando falhar?
        # Vamos tentar executar direto.
        pass

    # --- GET: Consultar Configuração ---
    if request.method == 'GET':
        wifi_config = service.get_wifi_config(device_id)
        if not wifi_config:
            msg = (service.last_error or {}).get('message') or 'Falha ao ler configurações do modem.'
            if any([app_user.wifi_ssid_2g, app_user.wifi_password_2g, app_user.wifi_ssid_5g, app_user.wifi_password_5g]):
                uptime_str = "N/A"
                if app_user.modem_uptime_seconds is not None:
                    try:
                        seconds = int(app_user.modem_uptime_seconds)
                        days = seconds // 86400
                        hours = (seconds % 86400) // 3600
                        minutes = (seconds % 3600) // 60
                        uptime_str = f"{days}d {hours}h {minutes}m"
                    except:
                        pass

                response_data = {
                    'ssid': app_user.wifi_ssid_2g,
                    'password': app_user.wifi_password_2g,
                    'ssid_5ghz': app_user.wifi_ssid_5g,
                    'password_5ghz': app_user.wifi_password_5g,
                    'model': app_user.modem_model or 'Desconhecido',
                    'manufacturer': app_user.modem_manufacturer or 'Desconhecido',
                    'wan_up_time': uptime_str,
                    'ip': app_user.modem_external_ip or '0.0.0.0',
                    'status': 'Sem conexão com modem',
                    'connected_count': 0,
                    'connected_devices': [],
                    'erro': False,
                    'mensagem': msg
                }
                return Response(response_data)

            return Response({'erro': True, 'mensagem': msg}, status=502)

        # Buscar info extra (Uptime, IP, Dispositivos)
        device_info = service.get_device_info(device_id) or {}
        
        # Formatar Uptime
        uptime_seconds = device_info.get('uptime', 0)
        uptime_str = "N/A"
        if uptime_seconds:
            try:
                seconds = int(uptime_seconds)
                days = seconds // 86400
                hours = (seconds % 86400) // 3600
                minutes = (seconds % 3600) // 60
                uptime_str = f"{days}d {hours}h {minutes}m"
            except:
                pass

        # Sincronizar senhas com banco local se estiverem vazias no GenieACS (segurança)
        # ou se quisermos garantir que o app mostre o que está no banco
        response_data = {
            'ssid': wifi_config.get('ssid_2g'),
            'password': wifi_config.get('password_2g') or app_user.wifi_password_2g,
            'ssid_5ghz': wifi_config.get('ssid_5g'),
            'password_5ghz': wifi_config.get('password_5g') or app_user.wifi_password_5g,
            'model': device_info.get('product_class') or wifi_config.get('model', 'Desconhecido'),
            'manufacturer': device_info.get('manufacturer') or wifi_config.get('manufacturer', 'Desconhecido'),
            'wan_up_time': uptime_str,
            'ip': device_info.get('external_ip', '0.0.0.0'),
            'status': 'Online',
            'connected_count': device_info.get('connected_count', 0),
            'connected_devices': device_info.get('connected_devices', [])
        }
        
        if not device_info and service.last_error:
            response_data['mensagem'] = service.last_error.get('message')
        
        # Atualizar banco local com o que lemos do GenieACS (opcional, mas bom para manter sync)
        update_fields = []
        if wifi_config.get('password_2g'):
            app_user.wifi_ssid_2g = wifi_config.get('ssid_2g')
            app_user.wifi_password_2g = wifi_config.get('password_2g')
            update_fields += ['wifi_ssid_2g', 'wifi_password_2g']
        if wifi_config.get('password_5g'):
            app_user.wifi_ssid_5g = wifi_config.get('ssid_5g')
            app_user.wifi_password_5g = wifi_config.get('password_5g')
            update_fields += ['wifi_ssid_5g', 'wifi_password_5g']

        if device_info:
            app_user.modem_model = device_info.get('product_class')
            app_user.modem_manufacturer = device_info.get('manufacturer')
            app_user.modem_external_ip = device_info.get('external_ip')
            app_user.modem_uptime_seconds = device_info.get('uptime')
            app_user.modem_last_sync_at = timezone.now()
            update_fields += ['modem_model', 'modem_manufacturer', 'modem_external_ip', 'modem_uptime_seconds', 'modem_last_sync_at']

        if update_fields:
            app_user.save(update_fields=list(set(update_fields)))

        return Response(response_data)

    # --- POST: Alterar Configuração ---
    elif request.method == 'POST':
        novo_ssid = request.data.get('novo_ssid')
        nova_senha = request.data.get('nova_senha')
        novo_ssid_5g = request.data.get('novo_ssid_5ghz')
        nova_senha_5g = request.data.get('nova_senha_5ghz')

        if not any([novo_ssid, nova_senha, novo_ssid_5g, nova_senha_5g]):
             return Response({'erro': True, 'mensagem': 'Nenhum parâmetro de alteração enviado.'}, status=400)

        success = service.change_wifi_config(
            device_id,
            ssid_2g=novo_ssid,
            password_2g=nova_senha,
            ssid_5g=novo_ssid_5g,
            password_5g=nova_senha_5g
        )

        if success:
            # Atualizar banco local
            if novo_ssid: app_user.wifi_ssid_2g = novo_ssid
            if nova_senha: app_user.wifi_password_2g = nova_senha
            if novo_ssid_5g: app_user.wifi_ssid_5g = novo_ssid_5g
            if nova_senha_5g: app_user.wifi_password_5g = nova_senha_5g
            app_user.save()

            return Response({'erro': False, 'mensagem': 'Configuração Wi-Fi enviada com sucesso! Aguarde alguns instantes.'})
        else:
            msg = (service.last_error or {}).get('message') or 'Falha ao aplicar configurações no modem via GenieACS.'
            status_code = 502 if (service.last_error or {}).get('kind') in ['connection', 'cwmp_port'] else 500
            return Response({'erro': True, 'mensagem': msg}, status=status_code)
