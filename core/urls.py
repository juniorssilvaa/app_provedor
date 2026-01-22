from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    # Auth
    path('login/', views.CustomLoginView.as_view(template_name='login.html'), name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('redirect/', views.login_redirect, name='login_redirect'),

    # Dashboard
    path('', views.dashboard, name='dashboard'),
    path('users/', views.user_list, name='user_list'),
    path('panel/users/', views.panel_user_list, name='panel_user_list'),
    path('panel/users/<int:pk>/delete/', views.panel_user_delete, name='panel_user_delete'),
    path('notifications/', views.notification_list, name='notification_list'),
    path('notifications/templates/create/', views.notification_template_create, name='notification_template_create'),
    path('notifications/templates/<int:pk>/edit/', views.notification_template_edit, name='notification_template_edit'),
    path('notifications/templates/<int:pk>/delete/', views.notification_template_delete, name='notification_template_delete'),
    path('warnings/', views.in_app_warnings, name='in_app_warnings'),
    path('warnings/<int:pk>/delete/', views.delete_in_app_warning, name='delete_in_app_warning'),
    path('config/', views.app_config, name='app_config'),
    path('profile/', views.profile_settings, name='profile_settings'),

    # New Super Admin
    path('super-admin/', views.super_admin_dashboard, name='super_admin_dashboard'),
    path('super-admin/providers/', views.super_admin_providers, name='super_admin_providers'),
    path('super-admin/users/', views.super_admin_users, name='super_admin_users'),
    path('super-admin/providers/create/', views.provider_create, name='provider_create'),
    path('super-admin/providers/<int:pk>/edit/', views.provider_edit, name='provider_edit'),
    path('super-admin/providers/<int:pk>/toggle-status/', views.provider_toggle_status, name='provider_toggle_status'),
    path('super-admin/ai-config/', views.super_admin_ai_config, name='super_admin_ai_config'),

    # Provider Panel
    path('panel/dashboard/', views.dashboard, name='provider_dashboard'), # Assuming 'dashboard' is the provider dashboard
    path('panel/integrations/sgp/', views.provider_sgp_integrations, name='provider_sgp_integrations'),
    path('panel/plans/', views.provider_plans, name='provider_plans'),
    path('panel/plans/<int:pk>/delete/', views.delete_plan, name='delete_plan'),
]
