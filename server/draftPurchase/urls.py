from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DraftPurchaseOrderViewSet

router = DefaultRouter()
router.register(r'draft-orders', DraftPurchaseOrderViewSet, basename='draft-purchase')

urlpatterns = [
    path('', include(router.urls)),
]