from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0008_appuser_modem_cache_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='device',
            name='push_confirmed',
            field=models.BooleanField(default=False, help_text='Marcado como True após primeiro envio de push bem-sucedido'),
        ),
        migrations.AddField(
            model_name='device',
            name='push_confirmed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

