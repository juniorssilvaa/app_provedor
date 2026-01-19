from django.urls import path
from . import views
from . import views_push
from . import sgp_proxy
from . import ai_views

urlpatterns = [
    # --- IA ASSISTANT & TELEMETRY ---
    path('telemetry/network/', ai_views.network_telemetry_api, name='network_telemetry'),
    path('ai/chat/', ai_views.ai_chat_api, name='ai_chat'),

    # Endpoint Público para o App (Configuração do Tenant)
    path('public/config/', views.get_app_configuration, name='get_app_configuration'),
    path('public/warnings/', views.get_in_app_warnings, name='get_in_app_warnings'),
    path('public/plans/', views.get_plans, name='get_plans'),

    path('providers/', views.providers_api, name='api_providers'),
    path('providers/<int:pk>/', views.provider_detail_api, name='api_provider_detail'),
    path('users/', views.users_api, name='api_users'),
    path('users/<int:pk>/', views.user_detail_api, name='api_user_detail'),

    # Proxy SGP (Centraliza as requisições do App)
    path('sgp/<path:endpoint>', sgp_proxy.proxy_sgp_request, name='sgp_proxy'),

    # Endpoints para Integração SGP (Painel do Provedor)
    path('panel/integrations/sgp/', views.get_sgp_integration, name='get_sgp_integration'),
    path('panel/integrations/sgp/generate/', views.generate_sgp_token, name='generate_sgp_token'),

    # Registro de Usuário do App (Legacy/Auth)
    path('app/register/', views.register_app_user, name='register_app_user'),
    
    # --- NOVAS ROTAS DE PUSH (FCM/Isolation) ---
    # 2) Registro de Dispositivo (Strict)
    path('devices/register/', views_push.register_device, name='register_device'),
    
    # 5) Webhook do SGP
    path('webhooks/sgp/', views_push.sgp_webhook, name='sgp_webhook'),
    
    # 6) Envio de Push (Admin) - Atualizado
    path('admin/push/send/', views_push.admin_send_push, name='send_push_notification'),
]
