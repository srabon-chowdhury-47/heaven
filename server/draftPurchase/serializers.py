from rest_framework import serializers
from .models import DraftPurchaseOrder, DraftPurchaseItem
from products.models import Product

class DraftPurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    part_number = serializers.CharField(source='product.part_number', read_only=True)
    weight = serializers.DecimalField(source='product.weight', max_digits=10, decimal_places=2, read_only=True)
    hs_code = serializers.CharField(source='product.hs_code', read_only=True)

    class Meta:
        model = DraftPurchaseItem
        fields = [
            'id', 'product', 'product_name', 'part_number', 'weight', 'hs_code',
            'quantity', 'unit_cost_bdt', 'total_cost_bdt',
            'discount', 'duty'   # included
        ]
        read_only_fields = ['total_cost_bdt']

    def create(self, validated_data):
        return DraftPurchaseItem.objects.create(**validated_data)


class DraftPurchaseOrderSerializer(serializers.ModelSerializer):
    items = DraftPurchaseItemSerializer(many=True)
    entry_by_name = serializers.CharField(source='entry_by', read_only=True)

    class Meta:
        model = DraftPurchaseOrder
        fields = '__all__'
        read_only_fields = ['draft_number', 'total_amount']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        total_amount = sum(float(item['unit_cost_bdt']) * item['quantity'] for item in items_data)
        validated_data['total_amount'] = total_amount
        draft_order = DraftPurchaseOrder.objects.create(**validated_data)

        for item_data in items_data:
            DraftPurchaseItem.objects.create(draft_order=draft_order, **item_data)

        return draft_order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if items_data:
            total_amount = sum(float(item['unit_cost_bdt']) * item['quantity'] for item in items_data)
            instance.total_amount = total_amount

        instance.save()

        if items_data:
            instance.items.all().delete()
            for item_data in items_data:
                DraftPurchaseItem.objects.create(draft_order=instance, **item_data)

        return instance