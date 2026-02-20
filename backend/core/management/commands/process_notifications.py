import time
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import ScheduledNotification, Notification
from api.push_service import send_push_notification_core
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Processa a fila de notificações push agendadas e realiza o envio.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--loop',
            action='store_true',
            help='Mantém o comando rodando em loop a cada 10 segundos.',
        )

    def handle(self, *args, **options):
        if options['loop']:
            self.stdout.write(self.style.SUCCESS(f"[{timezone.localtime().strftime('%H:%M:%S')}] Iniciando processamento contínuo (loop 10s)..."))
            while True:
                self.process_notifications()
                time.sleep(10)
        else:
            self.process_notifications()

    def process_notifications(self):
        now = timezone.now()
        pending_notifications = ScheduledNotification.objects.filter(
            status='pending',
            scheduled_at__lte=now
        )

        if not pending_notifications.exists():
            self.stdout.write(f"[{timezone.localtime().strftime('%H:%M:%S')}] Nenhuma notificação pendente.")
            return

        self.stdout.write(f"[{timezone.localtime().strftime('%H:%M:%S')}] Encontradas {pending_notifications.count()} notificações para processar.")

        for notification in pending_notifications:
            try:
                self.stdout.write(f"[{timezone.localtime().strftime('%H:%M:%S')}] Enviando: \"{notification.title}\" (ID: {notification.id})...")
                
                # Prepara dados extras se houver imagem
                data = {'type': notification.type}
                if notification.image_url:
                    data['image'] = notification.image_url

                # Chama o serviço central de envio
                result = send_push_notification_core(
                    provider_id=notification.provider.id,
                    title=notification.title,
                    message=notification.body,
                    data=data,
                    source='scheduled_task',
                    segment_type=notification.segment_type,
                    segment_tags=notification.segment_tags,
                    segment_search=notification.segment_search
                )

                # Atualiza o objeto agendado com o resultado
                sent = result.get('sent', 0)
                failed = result.get('failed', 0)
                
                if result.get('status') == 'completed' or result.get('status') == 'skipped':
                    notification.status = 'sent'
                    notification.sent_at = timezone.now()
                    notification.sent_count = sent
                    notification.failed_count = failed
                    if result.get('reason'):
                        notification.error_message = f"Status: {result.get('status')}, Motivo: {result.get('reason')}"
                else:
                    notification.status = 'failed'
                    notification.error_message = f"Erro no retorno do serviço: {result}"

                notification.save()
                
                # CRIAR OBJETO NOTIFICATION PARA HISTÓRICO DO DASHBOARD
                # Isso garante que a notificação apareça na lista geral de notificações do painel
                try:
                    Notification.objects.create(
                        provider=notification.provider,
                        title=notification.title,
                        body=notification.body,
                        status='sent' if sent > 0 else ('pending' if result.get('status') == 'skipped' else 'failed'),
                        recipients_count=sent + failed,
                        success_count=sent,
                        failure_count=failed
                    )
                except Exception as e_notif:
                    logger.error(f"Erro ao criar log visual de notificação: {e_notif}")

                self.stdout.write(self.style.SUCCESS(f"[{timezone.localtime().strftime('%H:%M:%S')}] Notificação {notification.id} processada. Enviados: {sent}"))

            except Exception as e:
                logger.error(f"Erro ao processar notificação agendada {notification.id}: {e}")
                notification.status = 'failed'
                notification.error_message = str(e)
                notification.save()
                self.stdout.write(self.style.ERROR(f"[{timezone.localtime().strftime('%H:%M:%S')}] Falha ao processar {notification.id}: {e}"))
