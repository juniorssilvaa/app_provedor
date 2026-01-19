from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import user_passes_test
from django.utils.decorators import method_decorator
from django.views import View
import json
from core.models import Provider, CustomUser, AppConfig, AppUser, InAppWarning, Device, Plan
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer
from rest_framework import serializers

# Helper to check superuser
def is_superuser(user):
    return user.is_superuser



@extend_schema(tags=['SuperAdmin'])
@api_view(['GET', 'POST'])
@user_passes_test(is_superuser)
def providers_api(request):
    if request.method == 'GET':
        providers = Provider.objects.all().order_by('-created_at')
        data = []
        for p in providers:
            user = p.customuser_set.first()
            data.append({
                'id': p.id,
                'name': p.name,
                'cnpj': p.cnpj or '',
                'number': p.number or '',
                'is_active': p.is_active,
                'created_at': p.created_at.strftime('%d/%m/%Y %H:%M'),
                'username': user.username if user else '-',
                'logo': p.logo.url if p.logo else None
            })
        return Response({'providers': data})
    
    elif request.method == 'POST':
        try:
            data = request.data
            name = data.get('name')
            cnpj = data.get('cnpj')
            number = data.get('number')
            username = data.get('username')
            password = data.get('password')
            
            if not all([name, username, password]): # CNPJ and Number optional? User said "precisa do nome cnpj e numero"
                 return Response({'error': 'Nome, Usuário e Senha são obrigatórios.'}, status=400)
            
            if not cnpj or not number:
                 return Response({'error': 'CNPJ e Número são obrigatórios.'}, status=400)

            if CustomUser.objects.filter(username=username).exists():
                return Response({'error': 'Nome de usuário já existe.'}, status=400)

            provider = Provider.objects.create(
                name=name,
                cnpj=cnpj,
                number=number
            )
            
            user = CustomUser.objects.create_user(username=username, password=password)
            user.provider = provider
            user.save()
            
            return Response({'message': 'Provedor criado com sucesso!', 'id': provider.id}, status=201)
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

@extend_schema(tags=['SuperAdmin'])
@api_view(['PUT', 'PATCH'])
@user_passes_test(is_superuser)
def provider_detail_api(request, pk):
    try:
        provider = Provider.objects.get(pk=pk)
    except Provider.DoesNotExist:
        return Response({'error': 'Provedor não encontrado.'}, status=404)

    try:
        data = request.data
        name = data.get('name')
        cnpj = data.get('cnpj')
        number = data.get('number')

        if name is not None:
            provider.name = name
        if cnpj is not None:
            provider.cnpj = cnpj
        if number is not None:
            provider.number = number

        provider.save()

        return Response({'message': 'Provedor atualizado com sucesso!'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@extend_schema(
    tags=['Public'],
    summary="Listar planos do provedor",
    description="Retorna os planos cadastrados pelo provedor que estão ativos para exibição no App.",
    parameters=[
        OpenApiParameter(name='provider_token', type=str, location=OpenApiParameter.QUERY, description="Token de identificação do provedor", required=True)
    ]
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_plans(request):
    """
    Retorna os planos cadastrados pelo provedor.
    Usa provider_token via Query Param.
    """
    provider_token = request.GET.get('provider_token')
    if not provider_token:
        return Response({'error': 'provider_token é obrigatório.'}, status=400)

    from core.models import ProviderToken
    provider = None
    
    # Resolve Provider via Token
    token_obj = ProviderToken.objects.filter(token=provider_token, is_active=True).first()
    if token_obj:
        provider = token_obj.provider
    else:
        # Fallback legado
        provider = Provider.objects.filter(sgp_token=provider_token, is_active=True).first()

    if not provider:
        return Response({'error': 'Token de provedor inválido ou inativo.'}, status=403)

    try:
        plans = Plan.objects.filter(provider=provider, is_active=True).order_by('price')
        data = []
        for p in plans:
            data.append({
                'id': str(p.id),
                'name': p.name,
                'type': p.type,
                'download_speed': p.download_speed,
                'upload_speed': p.upload_speed,
                'price': float(p.price),
                'price_display': f"R$ {p.price}".replace('.', ','),
                'description': p.description
            })
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@extend_schema(tags=['SuperAdmin'])
@api_view(['GET', 'POST'])
@user_passes_test(is_superuser)
def users_api(request):
    if request.method == 'GET':
        users = CustomUser.objects.all().select_related('provider').order_by('-date_joined')
        data = []
        for u in users:
            data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email or '',
                'first_name': u.first_name,
                'last_name': u.last_name,
                'is_superuser': u.is_superuser,
                'type': 'Superadmin' if u.is_superuser else 'Admin',
                'provider_name': u.provider.name if u.provider else 'Sem provedor',
                'provider_id': u.provider.id if u.provider else None,
                'is_active': u.is_active,
                'last_login': u.last_login.strftime('%d/%m/%Y %H:%M') if u.last_login else '-',
            })
        return Response({'users': data})

    elif request.method == 'POST':
        try:
            data = request.data
            username = data.get('username')
            password = data.get('password')
            email = data.get('email')
            first_name = data.get('first_name')
            last_name = data.get('last_name')
            user_type = data.get('type') # 'admin' or 'superadmin'
            provider_id = data.get('provider_id')

            if not all([username, password]):
                return Response({'error': 'Usuário e Senha são obrigatórios.'}, status=400)
            
            if CustomUser.objects.filter(username=username).exists():
                return Response({'error': 'Nome de usuário já existe.'}, status=400)

            # Enforce provider requirement based on user instruction
            if not provider_id:
                 return Response({'error': 'É obrigatório associar a um provedor.'}, status=400)
            
            provider = None
            if provider_id:
                try:
                    provider = Provider.objects.get(id=provider_id)
                except Provider.DoesNotExist:
                    return Response({'error': 'Provedor inválido.'}, status=400)

            user = CustomUser.objects.create_user(username=username, password=password, email=email)
            user.first_name = first_name
            user.last_name = last_name
            user.provider = provider
            
            if user_type == 'superadmin':
                user.is_superuser = True
                user.is_staff = True
            
            user.save()

            return Response({'message': 'Usuário criado com sucesso!', 'id': user.id}, status=201)

        except Exception as e:
            return Response({'error': str(e)}, status=500)

@extend_schema(tags=['SuperAdmin'])
@api_view(['DELETE', 'POST', 'PUT'])
@user_passes_test(is_superuser)
def user_detail_api(request, pk):
    try:
        user = CustomUser.objects.get(pk=pk)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Usuário não encontrado'}, status=404)

    if request.method == 'DELETE':
        if request.user.pk == user.pk:
             return Response({'error': 'Você não pode excluir seu próprio usuário.'}, status=400)
        user.delete()
        return Response({'message': 'Usuário excluído com sucesso'})
    
    elif request.method == 'POST':
        try:
            data = request.data
            action = data.get('action')
            
            if action == 'toggle_status':
                if request.user.pk == user.pk:
                     return Response({'error': 'Você não pode inativar seu próprio usuário.'}, status=400)
                user.is_active = not user.is_active
                user.save()
                return Response({'message': 'Status alterado com sucesso', 'is_active': user.is_active})
            return Response({'error': 'Ação inválida'}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    elif request.method == 'PUT':
        try:
            data = request.data
            username = data.get('username')
            email = data.get('email')
            first_name = data.get('first_name')
            last_name = data.get('last_name')
            user_type = data.get('type')
            provider_id = data.get('provider_id')

            if username:
                if CustomUser.objects.filter(username=username).exclude(pk=user.pk).exists():
                    return Response({'error': 'Nome de usuário já existe.'}, status=400)
                user.username = username

            if email is not None:
                user.email = email

            if first_name is not None:
                user.first_name = first_name

            if last_name is not None:
                user.last_name = last_name

            if provider_id is not None:
                if provider_id == '' or provider_id is False:
                    user.provider = None
                else:
                    try:
                        provider = Provider.objects.get(id=provider_id)
                    except Provider.DoesNotExist:
                        return Response({'error': 'Provedor inválido.'}, status=400)
                    user.provider = provider

            if user_type:
                if user_type == 'superadmin':
                    user.is_superuser = True
                    user.is_staff = True
                else:
                    user.is_superuser = False
                    user.is_staff = False

            user.save()
            return Response({'message': 'Usuário atualizado com sucesso!'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

@extend_schema(tags=['Panel'])
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sgp_integration(request):
    """
    Retorna os detalhes da integração SGP para o provedor do usuário logado.
    """
    if not hasattr(request.user, 'provider') or not request.user.provider:
        return Response({'error': 'Usuário não é um administrador de provedor.'}, status=403)

    provider = request.user.provider
    active_token = provider.get_active_token()
    
    # Fallback para token legado se não houver novo
    if not active_token:
        active_token = provider.sgp_token

    # Construindo a URL base de forma dinâmica
    scheme = request.is_secure() and "https" or "http"
    host = request.get_host()
    webhook_url = f"{scheme}://{host}/webhooks/sgp/"

    return Response({
        'provider_token': active_token,
        'sgp_token': provider.sgp_token or '',
        'sgp_url': provider.sgp_url or '',
        'webhook_url': webhook_url
    })

@extend_schema(tags=['Panel'])
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_sgp_token(request):
    """
    Gera (ou regenera) um novo token de integração para o provedor.
    """
    if not hasattr(request.user, 'provider') or not request.user.provider:
        return Response({'error': 'Usuário não é um administrador de provedor.'}, status=403)
        
    provider = request.user.provider
    token_obj = provider.generate_new_token()
    
    return Response({
        'message': 'Novo token de integração gerado com sucesso!',
        'provider_token': token_obj.token,
        'sgp_token': token_obj.token, # Compatibilidade UI
        'created_at': token_obj.created_at.strftime('%d/%m/%Y %H:%M:%S')
    }, status=201)

@extend_schema(
    tags=['Public'],
    summary="Configurações visuais do App",
    description="Retorna cores, logo, atalhos ativos e links sociais do provedor para personalização dinâmica do App.",
    parameters=[
        OpenApiParameter(name='provider_token', type=str, location=OpenApiParameter.QUERY, description="Token de identificação do provedor", required=True)
    ]
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_app_configuration(request):
    """
    Retorna as configurações do app (cores, logo, atalhos).
    Usa provider_token via Query Param.
    """
    print(f"DEBUG: get_app_configuration called with GET params: {request.GET}")
    provider_token = request.GET.get('provider_token')
    if not provider_token:
        return Response({'error': 'provider_token é obrigatório.'}, status=400)

    from core.models import ProviderToken
    provider = None
    
    # Resolve Provider via Token
    token_obj = ProviderToken.objects.filter(token=provider_token, is_active=True).first()
    if token_obj:
        provider = token_obj.provider
    else:
        # Fallback legado
        provider = Provider.objects.filter(sgp_token=provider_token, is_active=True).first()

    if not provider:
        return Response({'error': 'Token de provedor inválido ou inativo.'}, status=403)

    try:
        # Tenta obter a config, se não existir, cria uma default
        app_config, created = AppConfig.objects.get_or_create(provider=provider)
        
        response_data = {
            'provider_id': provider.id,
            'provider_name': provider.name,
            'provider_phone': provider.number,
            'primary_color': provider.primary_color,
            'logo_url': request.build_absolute_uri(provider.logo.url) if provider.logo else None,
            'active_shortcuts': app_config.active_shortcuts,
            'active_tools': app_config.active_tools,
            'social_links': app_config.social_links,
            'update_warning_active': app_config.update_warning_active,
            'is_active': provider.is_active
        }
        
        return Response(response_data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@extend_schema(
    tags=['App'],
    summary="Registrar usuário do App",
    description="Registra ou atualiza as informações do usuário e do dispositivo após o login no SGP.",
    request=inline_serializer(
        name='RegisterAppUserRequest',
        fields={
            'provider_token': serializers.CharField(help_text="Token sk_live_... do provedor"),
            'cpf': serializers.CharField(help_text="CPF ou CNPJ do cliente"),
            'name': serializers.CharField(required=False, help_text="Nome do cliente"),
            'email': serializers.EmailField(required=False, help_text="E-mail do cliente"),
            'customer_id': serializers.CharField(required=False, help_text="ID do cliente no SGP"),
            'device_platform': serializers.ChoiceField(choices=['android', 'ios'], required=False),
            'device_model': serializers.CharField(required=False),
            'device_os': serializers.CharField(required=False),
            'push_token': serializers.CharField(required=False, help_text="Token para notificações Push"),
        }
    )
)
@api_view(['POST'])
@permission_classes([AllowAny])
def register_app_user(request):
    """
    Endpoint para o app registrar o usuário após login no SGP.
    Obrigatório: provider_token.
    """
    try:
        data = request.data
        provider_token = data.get('provider_token')
        cpf = data.get('cpf')
        name = data.get('name')
        email = data.get('email')
        
        if not provider_token or not cpf:
            return Response({'error': 'provider_token e CPF obrigatórios'}, status=400)
            
        from core.models import ProviderToken
        provider = None
        
        # Resolve Provider via Token
        token_obj = ProviderToken.objects.filter(token=provider_token, is_active=True).first()
        if token_obj:
            provider = token_obj.provider
        else:
            # Fallback legado
            provider = Provider.objects.filter(sgp_token=provider_token, is_active=True).first()
            
        if not provider:
            return Response({'error': 'Token de provedor inválido ou inativo.'}, status=403)
        
        import re
        cpf_limpo = re.sub(r'\D', '', str(cpf))
        
        user, created = AppUser.objects.update_or_create(
            provider=provider,
            cpf=cpf_limpo,
            defaults={
                'name': name,
                'email': email,
                'active': True,
                'customer_id': data.get('customer_id') # Salva ID SGP
            }
        )

        # Register Device
        device_platform = data.get('device_platform')
        device_model = data.get('device_model')
        device_os = data.get('device_os')
        device_timestamp = data.get('device_timestamp')
        push_token = data.get('push_token')
        
        print(f"DEBUG: register_app_user called for {cpf}. Push Token Present: {bool(push_token)}")

        if device_platform and device_model:
            defaults = {
                'os_version': device_os or 'Unknown',
                'active': True,
                'provider': user.provider
            }
            
            if push_token:
                defaults['push_token'] = push_token
            # Se não tem token, deixa como está (ou null se for novo)
            
            if device_timestamp:
                from django.utils.dateparse import parse_datetime
                dt = parse_datetime(device_timestamp)
                if dt:
                    defaults['last_active'] = dt

            Device.objects.update_or_create(
                user=user,
                platform=device_platform.lower(),
                model=device_model,
                defaults=defaults
            )
        
        return Response({'success': True, 'user_id': user.id, 'created': created})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@extend_schema(
    tags=['Public'],
    summary="Avisos In-App",
    description="Retorna avisos e alertas configurados para serem exibidos dentro do aplicativo para clientes específicos ou gerais.",
    parameters=[
        OpenApiParameter(name='provider_token', type=str, location=OpenApiParameter.QUERY, description="Token de identificação do provedor", required=True),
        OpenApiParameter(name='cpf', type=str, location=OpenApiParameter.QUERY, description="CPF do cliente para filtrar avisos direcionados"),
        OpenApiParameter(name='contract_id', type=str, location=OpenApiParameter.QUERY, description="ID do contrato para filtrar avisos direcionados")
    ]
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_in_app_warnings(request):
    """
    Retorna avisos in-app filtrados por CPF/Contrato.
    Usa provider_token via Query Param.
    """
    provider_token = request.GET.get('provider_token')
    if not provider_token:
        return Response({'error': 'provider_token é obrigatório.'}, status=400)

    from core.models import ProviderToken
    provider = None
    
    # Resolve Provider via Token
    token_obj = ProviderToken.objects.filter(token=provider_token, is_active=True).first()
    if token_obj:
        provider = token_obj.provider
    else:
        # Fallback legado
        provider = Provider.objects.filter(sgp_token=provider_token, is_active=True).first()

    if not provider:
        return Response({'error': 'Token de provedor inválido ou inativo.'}, status=403)

    try:
        cpf = request.GET.get('cpf')
        contract_id = request.GET.get('contract_id')
        
        warnings = InAppWarning.objects.filter(provider=provider, active=True).order_by('-sticky', '-created_at')
        
        filtered_warnings = []
        for w in warnings:
            # Check CPFs
            if w.target_cpfs:
                target_cpfs = [c.strip() for c in w.target_cpfs.split(',')]
                if cpf and cpf not in target_cpfs:
                    continue 
                if not cpf:
                    continue 
            
            # Check Contracts
            if w.target_contracts:
                target_contracts = [c.strip() for c in w.target_contracts.split(',')]
                if contract_id and str(contract_id) not in target_contracts:
                    continue
                if not contract_id:
                    continue
            
            filtered_warnings.append({
                'id': w.id,
                'title': w.title,
                'message': w.message,
                'type': w.type,
                'whatsapp_btn': w.whatsapp_btn,
                'sticky': w.sticky,
                'show_home': w.show_home,
                'created_at': w.created_at
            })
            
        return Response(filtered_warnings)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
