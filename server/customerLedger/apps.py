from django.apps import AppConfig

class CustomerledgerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'customerLedger'

    def ready(self):
        import customerLedger.signals