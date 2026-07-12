from rest_framework import serializers
from .models import LedgerEntry

class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = [
            'id', 'transaction_date', 'amount', 'transaction_type',
            'description', 'reference_sale', 'reference_payment'
        ]