from django.apps import AppConfig

class UserConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'user'
    verbose_name = 'User Management'
    
    def ready(self):
        # Import signals if any
        pass