"""
Management command para processar notificações agendadas.
Este comando deve ser executado periodicamente (ex: a cada minuto via cron) para verificar e enviar notificações agendadas.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import ScheduledNotification
from api.push_service import send_push_notification_core
from django.db import transaction


class Command(BaseCommand):
    help = 'Processa notificações agendadas que estão no horário de envio'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Apenas mostra quais notificações seriam enviadas, sem enviar',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()
        
        # Buscar notificações pendentes que estão no horário
        scheduled_notifications = ScheduledNotification.objects.filter(
            status='pending',
            scheduled_at__lte=now
        ).order_by('scheduled_at')
        
        count = scheduled_notifications.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('Nenhuma notificação agendada para processar.'))
            return
        
        self.stdout.write(f'Encontradas {count} notificação(ões) agendada(s) para processar.')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Modo dry-run: nenhuma notificação será enviada.'))
            for notification in scheduled_notifications:
                self.stdout.write(f'  - {notification.title} (agendada para {notification.scheduled_at})')
            return
        
        processed = 0
        success = 0
        failed = 0
        
        for notification in scheduled_notifications:
            try:
                self.stdout.write(f'Processando: {notification.title}...')
                
                # Preparar dados
                data = {
                    'type': notification.type,
                }
                if notification.image_url:
                    data['image'] = notification.image_url
                
                # Enviar notificação
                result = send_push_notification_core(
                    provider_id=notification.provider.id,
                    title=notification.title,
                    message=notification.body,
                    data=data,
                    source='scheduled',
                    segment_type=notification.segment_type,
                    segment_tags=notification.segment_tags,
                    segment_search=notification.segment_search
                )
                
                # Atualizar status
                with transaction.atomic():
                    # Se o status é 'completed' e pelo menos uma notificação foi enviada, marca como enviada
                    if result.get('status') == 'completed':
                        sent_count = result.get('sent', 0)
                        failed_count = result.get('failed', 0)
                        
                        if sent_count > 0:
                            # Pelo menos uma notificação foi enviada com sucesso
                            notification.status = 'sent'
                            notification.sent_count = sent_count
                            notification.failed_count = failed_count
                            notification.sent_at = timezone.now()
                            success += 1
                        else:
                            # Nenhuma notificação foi enviada (todos os tokens falharam)
                            notification.status = 'failed'
                            notification.error_message = result.get('reason', 'Nenhuma notificação foi enviada. Todos os tokens falharam.')
                            notification.failed_count = failed_count
                            failed += 1
                    else:
                        # Status não é 'completed' (skipped, error, etc)
                        notification.status = 'failed'
                        notification.error_message = result.get('reason', 'Erro desconhecido')
                        notification.failed_count = result.get('failed', 0)
                        failed += 1
                    
                    notification.save()
                
                processed += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'[OK] {notification.title}: {result.get("sent", 0)} enviadas, {result.get("failed", 0)} falhas'
                    )
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'[ERRO] Erro ao processar {notification.title}: {str(e)}')
                )
                notification.status = 'failed'
                notification.error_message = str(e)
                notification.save()
                failed += 1
                processed += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nProcessamento concluído: {processed} processadas, {success} sucesso, {failed} falhas'
            )
        )
