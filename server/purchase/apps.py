# purchase/apps.py
from django.apps import AppConfig

class PurchaseConfig(AppConfig):
    name = 'purchase'

    def ready(self):
        """Register signals when app is ready"""
        import purchase.signals