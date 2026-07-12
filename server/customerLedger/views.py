from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from person.models import Customer
from .models import LedgerEntry
from .serializers import LedgerEntrySerializer

class LedgerEntryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LedgerEntry.objects.all()
    serializer_class = LedgerEntrySerializer
    filterset_fields = ['customer']

    @action(detail=False, methods=['get'], url_path='customer/(?P<customer_id>[^/.]+)/transactions')
    def customer_transactions(self, request, customer_id=None):
        try:
            customer = Customer.objects.get(pk=customer_id)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)

        entries = customer.ledger_entries.all().order_by('transaction_date', 'id')
        running_balance = 0
        data = []
        for entry in entries:
            if entry.transaction_type == 'DEBIT':
                running_balance -= entry.amount
            else:  # CREDIT
                running_balance += entry.amount
            data.append({
                'id': entry.id,
                'transaction_date': entry.transaction_date,
                'amount': entry.amount,
                'transaction_type': entry.transaction_type,
                'description': entry.description,
                'reference_sale': entry.reference_sale_id,
                'reference_payment': entry.reference_payment_id,
                'running_balance': running_balance,
            })
        return Response(data)

    @action(detail=False, methods=['get'], url_path='customer/(?P<customer_id>[^/.]+)/balance')
    def customer_balance(self, request, customer_id=None):
        try:
            customer = Customer.objects.get(pk=customer_id)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'customer_id': customer.customer_id,
            'customer_name': customer.proprietor_name,
            'balance': customer.balance
        })