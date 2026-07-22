from rest_framework import serializers
from .models import Stock, StockBatch


class StockBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockBatch
        fields = ['id', 'mrp', 'quantity', 'original_quantity', 'created_at', 'purchase_item']


class StockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    brand = serializers.CharField(source='product.brand', read_only=True)
    part_number = serializers.CharField(source='product.part_number', read_only=True)
    batches = StockBatchSerializer(many=True, read_only=True)

    # Convenience: weighted-average mrp across remaining batches, and FIFO "next" price
    average_mrp = serializers.SerializerMethodField()
    fifo_mrp = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = [
            'id', 'product', 'product_name', 'brand', 'part_number',
            'current_quantity', 'last_updated', 'batches', 'average_mrp', 'fifo_mrp',
        ]

    def get_average_mrp(self, obj):
        batches = [b for b in obj.batches.all() if b.quantity > 0]
        total_qty = sum(b.quantity for b in batches)
        if not total_qty:
            return None
        total_value = sum(b.quantity * b.mrp for b in batches)
        return round(total_value / total_qty, 2)

    def get_fifo_mrp(self, obj):
        batch = obj.batches.filter(quantity__gt=0).order_by('created_at').first()
        return batch.mrp if batch else None