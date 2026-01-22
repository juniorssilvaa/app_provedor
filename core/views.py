from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth import logout, authenticate
from django.contrib.auth.views import LoginView
from django.contrib.auth.forms import AuthenticationForm
from django import forms
from django.db.models import Q
from django.core.paginator import Paginator
from django.contrib import messages
from .models import Provider, Notification, InAppWarning, AppConfig, AppUser, SystemSettings, Plan, CustomUser
from api.push_service import send_push_notification_core


def check_active(request):
    if request.user.is_authenticated:
        if not request.user.is_active:
            logout(request)
            return render(request, 'blocked.html')
        if getattr(request.user, 'provider', None) and not request.user.provider.is_active:
            logout(request)
            return render(request, 'blocked.html')
    return None


class CustomAuthenticationForm(AuthenticationForm):
    error_messages = {
        **AuthenticationForm.error_messages,
        "invalid_login": "Usuário ou senha inválidos.",
    }

    def clean(self):
        username = self.cleaned_data.get("username")
        password = self.cleaned_data.get("password")

        if username is not None and password:
            self.user_cache = authenticate(self.request, username=username, password=password)
            if self.user_cache is None:
                from django.contrib.auth import get_user_model
                UserModel = get_user_model()
                try:
                    user = UserModel._default_manager.get_by_natural_key(username)
                except UserModel.DoesNotExist:
                    raise self.get_invalid_login_error()
                else:
                    if not user.is_active:
                        raise forms.ValidationError(
                            "Usuario desativado entre em contato com o suporte Via Whatsapp (94)984024089",
                            code="inactive",
                        )
                    raise self.get_invalid_login_error()
            self.confirm_login_allowed(self.user_cache)

        return self.cleaned_data

    def confirm_login_allowed(self, user):
        if not user.is_active:
            raise forms.ValidationError(
                "Usuario desativado entre em contato com o suporte Via Whatsapp (94)984024089",
                code="inactive",
            )
        return super().confirm_login_allowed(user)


class CustomLoginView(LoginView):
    authentication_form = CustomAuthenticationForm

@login_required
def login_redirect(request):
    if request.user.is_superuser:
        return redirect('super_admin_dashboard')
    else:
        return redirect('dashboard')

@login_required
def dashboard(request):
    blocked = check_active(request)
    if blocked: return blocked
    
    provider = request.user.provider
    if not provider:
        return render(request, 'base.html', {'segment': 'dashboard'})

    # Real data from DB
    total_users = AppUser.objects.filter(provider=provider).count()
    active_users = AppUser.objects.filter(provider=provider, active=True).count()
    inactive_users = total_users - active_users
    
    notifications = NotificationLog.objects.filter(provider=provider).order_by('-created_at')
    total_notifications = notifications.count()
    
    # Calculate stats
    success_count = sum(n.success_count for n in notifications)
    failure_count = sum(n.failure_count for n in notifications)
    total_sent = success_count + failure_count
    delivery_rate = int((success_count / total_sent * 100)) if total_sent > 0 else 0
    
    last_notification = notifications.first()
    
    # Dynamic dates for the last 7 days
    from django.utils import timezone
    from datetime import timedelta
    today = timezone.now().date()
    dates = [today - timedelta(days=i) for i in range(6, -1, -1)]
    chart_labels_7d = [d.strftime('%d/%m') for d in dates]
    
    # Chart data from notifications
    chart_data_sent = [0] * 7
    chart_data_failed = [0] * 7
    
    for n in notifications:
        n_date = n.created_at.date()
        if n_date in dates:
            idx = dates.index(n_date)
            chart_data_sent[idx] += n.success_count
            chart_data_failed[idx] += n.failure_count
            
    # Devices
    from .models import Device
    from django.db.models import Count
    
    total_devices = Device.objects.filter(user__provider=provider).count()
    android_devices = Device.objects.filter(user__provider=provider, platform='android').count()
    ios_devices = Device.objects.filter(user__provider=provider, platform='ios').count()
    
    # Most used models
    top_models = Device.objects.filter(user__provider=provider).values('model').annotate(count=Count('model')).order_by('-count')[:5]

    context = {
        'segment': 'dashboard',
        'provider': provider,
        'total_users': total_users,
        'active_users': active_users,
        'inactive_users': inactive_users,
        'active_percentage': int((active_users / total_users * 100)) if total_users > 0 else 0,
        
        'total_notifications': total_notifications,
        'success_count': success_count,
        'delivery_rate': delivery_rate,
        'failure_count': failure_count,
        'last_notification': last_notification,
        
        'android_devices': android_devices,
        'ios_devices': ios_devices,
        'android_percentage': int((android_devices / total_devices * 100)) if total_devices > 0 else 0,
        
        'top_models': top_models,
        'recent_notifications': notifications[:5],
        
        'chart_labels_7d': chart_labels_7d,
        'chart_data_sent': chart_data_sent,
        'chart_data_failed': chart_data_failed,
    }
    return render(request, 'dashboard.html', context)

@login_required
def panel_user_list(request):
    blocked = check_active(request)
    if blocked: return blocked
    
    provider = request.user.provider
    if not provider:
        return redirect('dashboard')

    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'create':
            username = request.POST.get('username')
            password = request.POST.get('password')
            email = request.POST.get('email')
            
            if not username or not password:
                messages.error(request, 'Usuário e senha são obrigatórios.')
            elif CustomUser.objects.filter(username=username).exists():
                messages.error(request, 'Este nome de usuário já está em uso.')
            else:
                CustomUser.objects.create_user(
                    username=username,
                    password=password,
                    email=email,
                    provider=provider
                )
                messages.success(request, f'Usuário {username} criado com sucesso!')
                return redirect('panel_user_list')
        
        elif action == 'edit':
            user_id = request.POST.get('user_id')
            user_to_edit = get_object_or_404(CustomUser, pk=user_id, provider=provider)
            
            new_username = request.POST.get('username')
            new_password = request.POST.get('password')
            new_email = request.POST.get('email')
            
            if new_username:
                if CustomUser.objects.filter(username=new_username).exclude(pk=user_id).exists():
                    messages.error(request, 'Este nome de usuário já está em uso.')
                else:
                    user_to_edit.username = new_username
            
            if new_email is not None:
                user_to_edit.email = new_email
                
            if new_password:
                user_to_edit.set_password(new_password)
                
            user_to_edit.save()
            messages.success(request, f'Usuário {user_to_edit.username} atualizado com sucesso!')
            return redirect('panel_user_list')

    users = CustomUser.objects.filter(provider=provider).order_by('-date_joined')
    return render(request, 'provider_users.html', {
        'segment': 'panel_users',
        'users': users
    })

@login_required
def panel_user_delete(request, pk):
    blocked = check_active(request)
    if blocked: return blocked
    
    provider = request.user.provider
    user_to_delete = get_object_or_404(CustomUser, pk=pk, provider=provider)
    
    if user_to_delete == request.user:
        messages.error(request, 'Você não pode excluir seu próprio usuário.')
    else:
        username = user_to_delete.username
        user_to_delete.delete()
        messages.success(request, f'Usuário {username} excluído com sucesso!')
        
    return redirect('panel_user_list')

@login_required
def user_list(request):
    blocked = check_active(request)
    if blocked: return blocked
    
    provider = request.user.provider
    if not provider:
        return render(request, 'base.html', {'segment': 'users'})

    # Base QuerySet
    users_qs = AppUser.objects.filter(provider=provider).prefetch_related('devices').order_by('-created_at')
    
    # Filters
    q = request.GET.get('q')
    if q:
        users_qs = users_qs.filter(
            Q(name__icontains=q) | 
            Q(email__icontains=q) | 
            Q(cpf__icontains=q) |
            Q(external_id__icontains=q)
        )
        
    status = request.GET.get('status')
    if status == 'active':
        users_qs = users_qs.filter(active=True)
    elif status == 'inactive':
        users_qs = users_qs.filter(active=False)
        
    platform = request.GET.get('platform')
    if platform:
        users_qs = users_qs.filter(devices__platform=platform).distinct()
        
    tags = request.GET.get('tags')
    if tags:
        users_qs = users_qs.filter(tags__icontains=tags)
        
    cpf = request.GET.get('cpf')
    if cpf:
        users_qs = users_qs.filter(cpf=cpf)
        
    # Pagination
    per_page = int(request.GET.get('per_page', 50))
    paginator = Paginator(users_qs, per_page)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'users.html', {'segment': 'users', 'users': page_obj})

@login_required
def notification_list(request):
    blocked = check_active(request)
    if blocked: return blocked
    
    if request.method == 'POST':
        # Verificar se deve salvar como template
        save_as_template = request.POST.get('save_as_template')
        if save_as_template:
            template_name = request.POST.get('template_name')
            if template_name:
                from .models import NotificationTemplate
                NotificationTemplate.objects.create(
                    provider=request.user.provider,
                    name=template_name,
                    title=request.POST.get('title'),
                    body=request.POST.get('body'),
                    type=request.POST.get('type', 'info'),
                    image_url=request.POST.get('image_url') or None,
                    created_by=request.user
                )
                messages.success(request, f'Template "{template_name}" salvo com sucesso!')
        
        title = request.POST.get('title')
        body = request.POST.get('body')
        push_type = request.POST.get('type', 'info')
        image_url = request.POST.get('image_url')
        segment_type = request.POST.get('segment_type', 'all')
        segment_tags = request.POST.get('segment_tags')
        segment_search = request.POST.get('segment_search')
        scheduled_at_str = request.POST.get('scheduled_at')
        
        # Verificar se há agendamento
        if scheduled_at_str:
            from django.utils.dateparse import parse_datetime
            from django.utils import timezone
            from datetime import datetime
            
            # O datetime-local retorna formato: YYYY-MM-DDTHH:MM
            # Precisamos converter para formato ISO com timezone
            try:
                # Tentar parse direto
                scheduled_at = parse_datetime(scheduled_at_str)
                # Se não tiver timezone, assumir timezone local
                if scheduled_at and scheduled_at.tzinfo is None:
                    scheduled_at = timezone.make_aware(scheduled_at)
            except (ValueError, TypeError):
                # Fallback: tentar parse manual
                try:
                    dt = datetime.strptime(scheduled_at_str, '%Y-%m-%dT%H:%M')
                    scheduled_at = timezone.make_aware(dt)
                except ValueError:
                    scheduled_at = None
            
            if scheduled_at and scheduled_at > timezone.now():
                # Salvar como notificação agendada
                from .models import ScheduledNotification
                scheduled = ScheduledNotification.objects.create(
                    provider=request.user.provider,
                    title=title,
                    body=body,
                    type=push_type,
                    image_url=image_url or None,
                    scheduled_at=scheduled_at,
                    segment_type=segment_type,
                    segment_tags=segment_tags or None,
                    segment_search=segment_search or None,
                    created_by=request.user
                )
                messages.success(request, f'Notificação agendada para {scheduled_at.strftime("%d/%m/%Y às %H:%M")}.')
                return redirect('notification_list')
            elif scheduled_at and scheduled_at <= timezone.now():
                messages.warning(request, 'A data/hora agendada deve ser no futuro. Enviando imediatamente.')
        
        # Opcionais e Dados Extras
        data = {
            'type': push_type,
            'image': image_url
        }
        # Remove valores vazios
        data = {k: v for k, v in data.items() if v}
        
        try:
            if not request.user.provider:
                messages.error(request, 'Erro: Usuário sem provedor associado.')
                return redirect('notification_list')

            # Usa o serviço central que garante o isolamento e log
            result = send_push_notification_core(
                provider_id=request.user.provider.id,
                title=title,
                message=body,
                data=data,
                source='panel',
                segment_type=segment_type,
                segment_tags=segment_tags,
                segment_search=segment_search
            )
            
            if result.get('status') == 'completed':
                sent = result.get('sent', 0)
                failed = result.get('failed', 0)
                
                # Opcional: Criar objeto Notification para o Dashboard (se o Log não for suficiente para a view)
                # O dashboard usa Notification, então vamos criar um para manter consistência visual
                Notification.objects.create(
                    provider=request.user.provider,
                    title=title,
                    body=body,
                    status='sent' if sent > 0 else 'failed',
                    recipients_count=sent + failed,
                    success_count=sent,
                    failure_count=failed
                )
                
                if sent > 0:
                    messages.success(request, f"Notificação enviada com sucesso para {sent} dispositivos.")
                else:
                    messages.warning(request, f"Envio finalizado, mas nenhum dispositivo recebeu a mensagem. Falhas: {failed}")
            elif result.get('reason') == 'no_devices_found':
                debug = result.get('debug', {})
                msg = "Nenhum dispositivo encontrado para receber esta mensagem."
                if debug.get('total', 0) == 0:
                    msg = "Erro: Não há nenhum dispositivo vinculado ao seu provedor. Verifique se o Token de Integração no Aplicativo está configurado corretamente."
                elif debug.get('with_token', 0) == 0:
                    msg = "Existem clientes cadastrados, mas nenhum possui um token de push válido no momento."
                
                messages.warning(request, msg)
            else:
                messages.warning(request, f"Resultado do envio: {result.get('status')} - {result.get('reason', '')}")
                
        except Exception as e:
            messages.error(request, f"Erro ao processar envio: {str(e)}")
            
        return redirect('notification_list')
        
    # Buscar templates do provedor
    provider = request.user.provider
    templates = []
    scheduled_notifications = []
    if provider:
        from .models import NotificationTemplate, ScheduledNotification
        templates = NotificationTemplate.objects.filter(provider=provider).order_by('-updated_at')
        scheduled_notifications = ScheduledNotification.objects.filter(
            provider=provider
        ).order_by('-scheduled_at')[:10]  # Últimas 10 agendadas
    
    return render(request, 'notifications.html', {
        'segment': 'notifications',
        'templates': templates,
        'scheduled_notifications': scheduled_notifications
    })


@login_required
def notification_template_create(request):
    """Criar novo template de notificação"""
    blocked = check_active(request)
    if blocked: return blocked
    
    if request.method == 'POST':
        provider = request.user.provider
        if not provider:
            messages.error(request, 'Erro: Usuário sem provedor associado.')
            return redirect('notification_list')
        
        from .models import NotificationTemplate
        template = NotificationTemplate.objects.create(
            provider=provider,
            name=request.POST.get('name'),
            title=request.POST.get('title'),
            body=request.POST.get('body'),
            type=request.POST.get('type', 'info'),
            image_url=request.POST.get('image_url') or None,
            created_by=request.user
        )
        messages.success(request, f'Template "{template.name}" criado com sucesso!')
        return redirect('notification_list')
    
    return render(request, 'notification_template_form.html', {
        'segment': 'notifications',
        'template': None
    })


@login_required
def notification_template_edit(request, pk):
    """Editar template de notificação"""
    blocked = check_active(request)
    if blocked: return blocked
    
    from .models import NotificationTemplate
    template = get_object_or_404(NotificationTemplate, pk=pk, provider=request.user.provider)
    
    if request.method == 'POST':
        template.name = request.POST.get('name')
        template.title = request.POST.get('title')
        template.body = request.POST.get('body')
        template.type = request.POST.get('type', 'info')
        template.image_url = request.POST.get('image_url') or None
        template.save()
        messages.success(request, f'Template "{template.name}" atualizado com sucesso!')
        return redirect('notification_list')
    
    return render(request, 'notification_template_form.html', {
        'segment': 'notifications',
        'template': template
    })


@login_required
def notification_template_delete(request, pk):
    """Deletar template de notificação"""
    blocked = check_active(request)
    if blocked: return blocked
    
    from .models import NotificationTemplate
    template = get_object_or_404(NotificationTemplate, pk=pk, provider=request.user.provider)
    name = template.name
    template.delete()
    messages.success(request, f'Template "{name}" excluído com sucesso!')
    return redirect('notification_list')

@login_required
def in_app_warnings(request):
    blocked = check_active(request)
    if blocked: return blocked
    
    if request.method == 'POST':
        title = request.POST.get('title')
        message = request.POST.get('message')
        type_ = request.POST.get('type')
        whatsapp_enabled = request.POST.get('whatsapp_enabled')
        whatsapp_number = request.POST.get('whatsapp_number')
        sticky = request.POST.get('sticky') == 'on'
        show_home = request.POST.get('show_home') == 'on'
        target_cpfs = request.POST.get('target_cpfs')
        target_contracts = request.POST.get('target_contracts')
        
        InAppWarning.objects.create(
            provider=request.user.provider,
            title=title,
            message=message,
            type=type_,
            whatsapp_btn=whatsapp_number if whatsapp_enabled == 'on' else None,
            sticky=sticky,
            show_home=show_home,
            target_cpfs=target_cpfs,
            target_contracts=target_contracts
        )
        return redirect('in_app_warnings')
        
    warnings = InAppWarning.objects.filter(provider=request.user.provider, active=True).order_by('-created_at')
    return render(request, 'in_app_warnings.html', {'segment': 'in_app_warnings', 'warnings': warnings})

@login_required
def delete_in_app_warning(request, pk):
    # Check active status
    blocked = check_active(request)
    if blocked: return blocked
    
    warning = get_object_or_404(InAppWarning, pk=pk, provider=request.user.provider)
    warning.delete()
    return redirect('in_app_warnings')

@login_required
def app_config(request):
    blocked = check_active(request)
    if blocked: return blocked
    
    provider = request.user.provider
    if not provider:
        return redirect('dashboard')
        
    config, created = AppConfig.objects.get_or_create(provider=provider)
    
    if request.method == 'POST':
        # Get list of selected shortcuts and tools
        # The checkboxes will send values only if checked.
        # We expect inputs with name="shortcuts" and name="tools"
        shortcuts = request.POST.getlist('shortcuts')
        tools = request.POST.getlist('tools')
        social_links = request.POST.getlist('social_links') # Future use
        
        # Update config
        config.active_shortcuts = shortcuts
        config.active_tools = tools
        config.update_warning_active = 'update_warning' in request.POST
        config.save()
        
        from django.contrib import messages
        messages.success(request, 'Configurações do aplicativo atualizadas com sucesso!')
        return redirect('app_config')

    return render(request, 'app_config.html', {
        'segment': 'app_config',
        'config': config,
        'all_shortcuts': [
            'FATURAS', 'NOTAS FISCAIS', 'PROMESSAS DE PAGAMENTO', 
            'CONSUMO', 'STREAMING', 'PLANOS', 'ATENDIMENTO', 
            'CHAMADOS', 'TERMOS'
        ],
        'all_tools': [
            'MEU WI-FI', 'MEU ROTEADOR', 'AGENTE DE IA', 
            'SPEED TEST', 'FAST TEST', 'DIAGNÓSTICO WI-FI', 'CÂMERAS'
        ]
    })

@login_required
def profile_settings(request):
    blocked = check_active(request)
    if blocked: return blocked
    
    provider = request.user.provider
    if not provider:
        # Se o usuário não tiver provedor, redireciona ou mostra erro (embora o check_active já deva tratar)
        return redirect('dashboard')

    if request.method == 'POST':
        # Atualizar configurações de estilo
        if 'primary_color' in request.POST:
            provider.primary_color = request.POST.get('primary_color')
            provider.glass_intensity = int(request.POST.get('glass_intensity', 82))
            provider.glass_blur = int(request.POST.get('glass_blur', 18))
            provider.ambient_shadow = int(request.POST.get('ambient_shadow', 55))
            
            if 'logo' in request.FILES:
                provider.logo = request.FILES['logo']
                
            provider.save()
            from django.contrib import messages
            messages.success(request, 'Perfil atualizado com sucesso!')
            
    return render(request, 'profile_settings.html', {
        'segment': 'profile',
        'provider': provider
    })

def logout_view(request):
    logout(request)
    return redirect('login')

def is_superuser(user):
    return user.is_superuser

@user_passes_test(is_superuser)
def super_admin_users(request):
    blocked = check_active(request)
    if blocked:
        return blocked
    return render(request, 'super_admin/users_react.html', {'segment': 'super_admin_users'})

@user_passes_test(is_superuser)
def super_admin_providers(request):
    blocked = check_active(request)
    if blocked:
        return blocked
    return render(request, 'super_admin/providers_react.html', {'segment': 'super_admin_providers'})

@user_passes_test(is_superuser)
def super_admin_dashboard(request):
    blocked = check_active(request)
    if blocked:
        return blocked
    from django.db.models import Count

    # Otimiza a consulta para buscar provedores, contar usuários de app e buscar admins relacionados
    providers_list = Provider.objects.annotate(
        app_user_count=Count('app_users')
    ).prefetch_related('customuser_set').order_by('-created_at')

    total_providers = providers_list.count()
    active_providers = sum(1 for p in providers_list if p.is_active)
    inactive_providers = total_providers - active_providers
    
    total_admins = CustomUser.objects.filter(is_superuser=False).count()
    total_app_users = AppUser.objects.count()

    # Associa o primeiro usuário admin encontrado para cada provedor (eficiente devido ao prefetch)
    for p in providers_list:
        p.user = p.customuser_set.first()

    context = {
        'segment': 'super_admin_dashboard',
        'providers': providers_list,
        'total_providers': total_providers,
        'active_providers': active_providers,
        'inactive_providers': inactive_providers,
        'total_admins': total_admins,
        'total_app_users': total_app_users,
    }
    return render(request, 'super_admin/dashboard.html', context)

@user_passes_test(is_superuser)
def provider_create(request):
    blocked = check_active(request)
    if blocked:
        return blocked
    if request.method == 'POST':
        name = request.POST.get('name')
        cnpj = request.POST.get('cnpj')
        number = request.POST.get('number')
        sgp_url = request.POST.get('sgp_url')
        sgp_token = request.POST.get('sgp_token')
        sgp_app_name = request.POST.get('sgp_app_name')
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        if name and username and password and cnpj and number:
            try:
                # Check if username already exists
                if CustomUser.objects.filter(username=username).exists():
                    return render(request, 'super_admin/provider_form.html', {
                        'error': 'Nome de usuário já existe.',
                        'name': name,
                        'username': username,
                        'cnpj': cnpj,
                        'number': number,
                        'sgp_url': sgp_url,
                        'sgp_token': sgp_token,
                        'sgp_app_name': sgp_app_name
                    })

                # Create Provider
                provider = Provider.objects.create(
                    name=name,
                    cnpj=cnpj,
                    number=number,
                    sgp_url=sgp_url,
                    sgp_token=sgp_token,
                    sgp_app_name=sgp_app_name
                )
                
                # Create User linked to Provider
                user = CustomUser.objects.create_user(username=username, password=password)
                user.provider = provider
                user.save()
                
                return redirect('super_admin_dashboard')
            except Exception as e:
                return render(request, 'super_admin/provider_form.html', {
                    'error': f'Erro ao criar provedor: {str(e)}',
                    'name': name,
                    'username': username,
                    'cnpj': cnpj,
                    'number': number
                })
                
    return render(request, 'super_admin/provider_form.html')

@user_passes_test(is_superuser)
def provider_edit(request, pk):
    blocked = check_active(request)
    if blocked:
        return blocked
    provider = get_object_or_404(Provider, pk=pk)
    if request.method == 'POST':
        provider.name = request.POST.get('name')
        provider.cnpj = request.POST.get('cnpj')
        provider.number = request.POST.get('number')
        provider.sgp_url = request.POST.get('sgp_url')
        provider.sgp_token = request.POST.get('sgp_token')
        provider.sgp_app_name = request.POST.get('sgp_app_name')
        provider.save()
        return redirect('super_admin_dashboard')
    return render(request, 'super_admin/provider_form.html', {'provider': provider})

@user_passes_test(is_superuser)
def provider_toggle_status(request, pk):
    blocked = check_active(request)
    if blocked:
        return blocked
    provider = get_object_or_404(Provider, pk=pk)
    provider.is_active = not provider.is_active
    provider.save()
    return redirect('super_admin_dashboard')

@login_required
def provider_sgp_integrations(request):
    """
    Renderiza a página de configurações de integração SGP para o provedor.
    Permite que o provedor configure sua própria URL e Token do SGP para a IA.
    """
    blocked = check_active(request)
    if blocked:
        return blocked

    if not hasattr(request.user, 'provider') or request.user.is_superuser:
        return redirect('login')

    provider = request.user.provider

    if request.method == 'POST':
        sgp_url = request.POST.get('sgp_url', '').strip()
        sgp_token = request.POST.get('sgp_token', '').strip()
        sgp_app_name = request.POST.get('sgp_app_name', '').strip()
        
        provider.sgp_url = sgp_url
        # Se sgp_token for vazio, salvar como None para não violar unique constraint
        provider.sgp_token = sgp_token if sgp_token else None
        provider.sgp_app_name = sgp_app_name
        
        try:
            provider.save()
            messages.success(request, 'Configurações de integração SGP atualizadas com sucesso!')
        except Exception as e:
            messages.error(request, f'Erro ao salvar configurações: {str(e)}')
        
        return redirect('provider_sgp_integrations')

    context = {
        'segment': 'provider_integrations_sgp',
        'provider': provider
    }
    return render(request, 'pages/provider/integrations_sgp.html', context)

@user_passes_test(is_superuser)
def super_admin_ai_config(request):
    blocked = check_active(request)
    if blocked:
        return blocked
    
    settings, created = SystemSettings.objects.get_or_create(id=1)
    
    if request.method == 'POST':
        gemini_api_key = request.POST.get('gemini_api_key')
        settings.gemini_api_key = gemini_api_key
        settings.save()
        messages.success(request, 'Configurações do Agente de IA atualizadas com sucesso!')
        return redirect('super_admin_ai_config')
        
    return render(request, 'super_admin/ai_config.html', {
        'segment': 'super_admin_ai',
        'settings': settings
    })

@login_required
def provider_plans(request):
    blocked = check_active(request)
    if blocked: return blocked
    
    provider = request.user.provider
    if not provider:
        return redirect('dashboard')

    if request.method == 'POST':
        plan_id = request.POST.get('plan_id')
        name = request.POST.get('name')
        type = request.POST.get('type')
        download_speed = request.POST.get('download_speed')
        upload_speed = request.POST.get('upload_speed')
        price = request.POST.get('price')
        description = request.POST.get('description')
        is_active = request.POST.get('is_active') == 'on'

        if plan_id:
            plan = get_object_or_404(Plan, id=plan_id, provider=provider)
            plan.name = name
            plan.type = type
            plan.download_speed = download_speed
            plan.upload_speed = upload_speed
            plan.price = price
            plan.description = description
            plan.is_active = is_active
            plan.save()
            messages.success(request, 'Plano atualizado com sucesso!')
        else:
            Plan.objects.create(
                provider=provider,
                name=name,
                type=type,
                download_speed=download_speed,
                upload_speed=upload_speed,
                price=price,
                description=description,
                is_active=is_active
            )
            messages.success(request, 'Plano criado com sucesso!')
        
        return redirect('provider_plans')

    plans = Plan.objects.filter(provider=provider).order_by('-created_at')
    return render(request, 'plans_config.html', {
        'segment': 'plans_config',
        'plans': plans
    })

@login_required
def delete_plan(request, pk):
    blocked = check_active(request)
    if blocked: return blocked
    
    plan = get_object_or_404(Plan, pk=pk, provider=request.user.provider)
    plan.delete()
    messages.success(request, 'Plano excluído com sucesso!')
    return redirect('provider_plans')
