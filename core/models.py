from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class Provider(models.Model):
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    primary_color = models.CharField(max_length=7, default='#3b82f6')
    glass_intensity = models.IntegerField(default=82)
    glass_blur = models.IntegerField(default=18)
    ambient_shadow = models.IntegerField(default=55)
    cnpj = models.CharField(max_length=20, blank=True, null=True)
    number = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    # Campos para Integração SGP (Legacy - Mantidos para compatibilidade se necessário)
    sgp_url = models.URLField(max_length=255, blank=True, null=True, help_text="URL base do SGP (ex: https://r7fibra.sgp.tsmx.com.br)")
    sgp_token = models.CharField(max_length=64, unique=True, blank=True, null=True, help_text="Token de autenticação para webhooks do SGP.")
    sgp_app_name = models.CharField(max_length=64, blank=True, null=True, help_text="Nome do App cadastrado no SGP (ex: webchat)")
    sgp_token_created_at = models.DateTimeField(blank=True, null=True, help_text="Data de criação do token SGP.")

    def __str__(self):
        return self.name

    def get_active_token(self):
        """Retorna o token ativo do provedor."""
        token_obj = self.tokens.filter(is_active=True).first()
        return token_obj.token if token_obj else None

    def generate_new_token(self):
        """Gera um novo token, invalidando os anteriores."""
        self.tokens.all().update(is_active=False)
        return ProviderToken.objects.create(provider=self)

class ProviderToken(models.Model):
    token = models.CharField(max_length=255, unique=True, db_index=True)
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name='tokens')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.token:
            import secrets
            # Prefixo sk_live_ para tokens de produção conforme padrão solicitado
            self.token = f"sk_live_{secrets.token_hex(24)}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.provider.name} - {self.token[:15]}..."

class CustomUser(AbstractUser):
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        verbose_name = 'user'
        verbose_name_plural = 'users'

class AppUser(models.Model):
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name='app_users', null=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    cpf = models.CharField(max_length=14)
    external_id = models.CharField(max_length=100, blank=True, null=True)
    customer_id = models.CharField(max_length=50, blank=True, null=True, db_index=True, help_text="ID do cliente no SGP")
    created_at = models.DateTimeField(auto_now_add=True)
    tags = models.CharField(max_length=255, blank=True, null=True)
    active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('provider', 'cpf')

    def __str__(self):
        return f"{self.name} ({self.cpf})"

class AppConfig(models.Model):
    provider = models.OneToOneField(Provider, on_delete=models.CASCADE, related_name='app_config')
    active_shortcuts = models.JSONField(default=list, blank=True)
    active_tools = models.JSONField(default=list, blank=True)
    social_links = models.JSONField(default=list, blank=True)
    update_warning_active = models.BooleanField(default=False)

    def __str__(self):
        return f"Config for {self.provider.name}"

class InAppWarning(models.Model):
    TYPE_CHOICES = [
        ('info', 'Informativo'),
        ('success', 'Sucesso'),
        ('warning', 'Aviso'),
        ('critical', 'Crítico'),
    ]
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name='in_app_warnings')
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    whatsapp_btn = models.CharField(max_length=20, blank=True, null=True)
    sticky = models.BooleanField(default=False)
    show_home = models.BooleanField(default=False)
    target_cpfs = models.TextField(blank=True, help_text='Separados por vírgula')
    target_contracts = models.TextField(blank=True, help_text='Separados por vírgula')
    created_at = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.title

class Notification(models.Model):
    STATUS_CHOICES = [
        ('sent', 'Enviado'),
        ('failed', 'Falha'),
        ('pending', 'Pendente'),
    ]
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name='notifications', null=True)
    title = models.CharField(max_length=255)
    body = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    recipients_count = models.IntegerField(default=0)
    success_count = models.IntegerField(default=0)
    failure_count = models.IntegerField(default=0)

    def __str__(self):
        return self.title

class AppFunction(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    users = models.ManyToManyField(AppUser, related_name='functions', blank=True)

    def __str__(self):
        return self.name

class Device(models.Model):
    PLATFORM_CHOICES = [
        ('android', 'Android'),
        ('ios', 'iOS'),
    ]
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='devices')
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    model = models.CharField(max_length=100)
    os_version = models.CharField(max_length=50)
    push_token = models.CharField(max_length=255, unique=True, null=True, blank=True, help_text="FCM/Expo Token")
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name='devices', default=1)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ('provider', 'push_token')

    def __str__(self):
        return f"{self.platform} - {self.model}"

class NotificationLog(models.Model):
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name='notification_logs')
    source = models.CharField(max_length=50) # 'sgp', 'panel'
    title = models.CharField(max_length=255)
    body = models.TextField()
    recipients_count = models.IntegerField()
    success_count = models.IntegerField()
    failure_count = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.source} - {self.created_at}"

class NetworkTelemetry(models.Model):
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='telemetries')
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE)
    ssid = models.CharField(max_length=255, blank=True, null=True)
    wifi_dbm = models.IntegerField(blank=True, null=True)
    band = models.CharField(max_length=50, blank=True, null=True)
    link_speed = models.IntegerField(blank=True, null=True)
    latency = models.FloatField(blank=True, null=True)
    packet_loss = models.FloatField(blank=True, null=True)
    jitter = models.FloatField(blank=True, null=True)
    network_type = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Telemetry {self.user.name} - {self.created_at}"

class AIChatSession(models.Model):
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='chat_sessions')
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Chat {self.user.name} - {self.created_at}"

class AIChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'Usuário'),
        ('assistant', 'Assistente'),
        ('system', 'Sistema'),
    ]
    session = models.ForeignKey(AIChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"

class SystemSettings(models.Model):
    gemini_api_key = models.CharField(max_length=255, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "Configurações Globais do Sistema"

    class Meta:
        verbose_name = "Configuração Global"
        verbose_name_plural = "Configurações Globais"
