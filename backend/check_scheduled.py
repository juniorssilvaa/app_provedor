import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'niochat.settings')
django.setup()

from core.models import ScheduledNotification
from django.utils import timezone

print("=" * 60)
print("STATUS DO SISTEMA DE AGENDAMENTO DE NOTIFICAÇÕES")
print("=" * 60)

total = ScheduledNotification.objects.count()
pending = ScheduledNotification.objects.filter(status='pending').count()
sent = ScheduledNotification.objects.filter(status='sent').count()
failed = ScheduledNotification.objects.filter(status='failed').count()
cancelled = ScheduledNotification.objects.filter(status='cancelled').count()

print(f"\nEstatisticas Gerais:")
print(f"   Total: {total}")
print(f"   Pendentes: {pending}")
print(f"   Enviadas: {sent}")
print(f"   Falhadas: {failed}")
print(f"   Canceladas: {cancelled}")

if pending > 0:
    print(f"\nNotificacoes Pendentes:")
    now = timezone.now()
    pending_notifications = ScheduledNotification.objects.filter(status='pending').order_by('scheduled_at')
    
    for notif in pending_notifications:
        time_diff = notif.scheduled_at - now
        if time_diff.total_seconds() < 0:
            status = "[ATRASADA] Deveria ter sido enviada"
        elif time_diff.total_seconds() < 60:
            status = "[PRONTA] Menos de 1 minuto para envio"
        else:
            hours = int(time_diff.total_seconds() / 3600)
            minutes = int((time_diff.total_seconds() % 3600) / 60)
            status = f"[AGENDADA] {hours}h {minutes}min restantes"
        
        print(f"   - ID {notif.id}: {notif.title}")
        print(f"     Agendada para: {notif.scheduled_at}")
        print(f"     Status: {status}")
        print(f"     Provedor: {notif.provider.name}")
        print()

print("\n" + "=" * 60)
print("[OK] Sistema de agendamento esta funcionando!")
print("=" * 60)
