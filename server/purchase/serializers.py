# purchase/serializers.py
from rest_framework import serializers
from .models import PurchaseOrder, PurchaseItem
from products.models import Product

class PurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    part_number = serializers.CharField(source='product.part_number', read_only=True)

    class Meta:
        model = PurchaseItem
        fields = ['id', 'product', 'product_name', 'part_number', 'quantity', 'unit_cost_bdt', 'total_cost_bdt']
        read_only_fields = ['total_cost_bdt']

    def create(self, validated_data):
        """Create purchase item and update product cost"""
        # Create the purchase item
        purchase_item = PurchaseItem.objects.create(**validated_data)
        
        # Update product cost (already handled in PurchaseItem.save())
        # But we can also do it here explicitly
        return purchase_item


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True)
    entry_by_name = serializers.CharField(source='entry_by.name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ['po_number', 'total_amount', 'payment_status']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # 1. Calculate the exact grand total from the incoming items
        total_amount = sum(float(item['unit_cost_bdt']) * item['quantity'] for item in items_data)
        validated_data['total_amount'] = total_amount
        
        # 2. Create Master Order
        purchase_order = PurchaseOrder.objects.create(**validated_data)
        
        # 3. Create Items (this will trigger the product cost update via PurchaseItem.save())
        for item_data in items_data:
            PurchaseItem.objects.create(purchase_order=purchase_order, **item_data)
            
        return purchase_order

    def update(self, instance, validated_data):
        # Get items data from validated_data (if provided)
        items_data = validated_data.pop('items', [])
        
        # Update the purchase order fields (excluding items)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Recalculate total amount from items if items are provided
        if items_data:
            # Calculate total from the new items
            total_amount = sum(float(item['unit_cost_bdt']) * item['quantity'] for item in items_data)
            instance.total_amount = total_amount
        
        # Save the purchase order instance
        instance.save()
        
        # Handle items - clear existing and create new ones
        if items_data:
            # Delete all existing items for this purchase order
            instance.items.all().delete()
            
            # Create new items (this will trigger product cost update)
            for item_data in items_data:
                PurchaseItem.objects.create(purchase_order=instance, **item_data)
        
        return instance