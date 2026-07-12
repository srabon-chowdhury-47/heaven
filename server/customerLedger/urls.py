from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LedgerEntryViewSet

router = DefaultRouter()
router.register(r'transactions', LedgerEntryViewSet, basename='ledger')

urlpatterns = [
    path('', include(router.urls)),
]