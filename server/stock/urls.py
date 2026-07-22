from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StockViewSet, StockBatchViewSet

router = DefaultRouter()
router.register(r'stocks', StockViewSet, basename='stock')
router.register(r'stock-batches', StockBatchViewSet, basename='stock-batch')

urlpatterns = [
    path('', include(router.urls)),
]