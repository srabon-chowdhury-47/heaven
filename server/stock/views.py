from rest_framework import viewsets
from .models import Stock, StockBatch
from .serializers import StockSerializer, StockBatchSerializer


class StockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Stock.objects.all().order_by('product__product_name').prefetch_related('batches')
    serializer_class = StockSerializer


class StockBatchViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockBatch.objects.all().order_by('product', 'created_at')
    serializer_class = StockBatchSerializer
    filterset_fields = ['product']