from rest_framework import viewsets
from .models import DraftPurchaseOrder
from .serializers import DraftPurchaseOrderSerializer

class DraftPurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = DraftPurchaseOrder.objects.all().order_by('-purchase_date')
    serializer_class = DraftPurchaseOrderSerializer