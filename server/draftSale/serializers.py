from rest_framework import serializers
from .models import DraftSaleOrder, DraftSaleItem

class DraftSaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    part_number = serializers.CharField(source='product.part_number', read_only=True)
    purchase_price_bdt = serializers.DecimalField(source='product.purchase_cost_bdt', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = DraftSaleItem
        fields = ['id', 'product', 'product_name', 'part_number', 'purchase_price_bdt', 
                 'quantity', 'unit_price_bdt', 'multiplier', 'total_price_bdt', 'profit_bdt']
        read_only_fields = ['total_price_bdt', 'profit_bdt']

    def validate(self, data):
        """Validate that multiplier and unit_price are consistent"""
        if 'multiplier' in data and data['multiplier'] and 'unit_price_bdt' in data:
            # Check if multiplier is in the payload
            pass  # Optional: Add validation logic here
        return data

class DraftSaleOrderSerializer(serializers.ModelSerializer):
    items = DraftSaleItemSerializer(many=True)
    sold_by_name = serializers.CharField(source='sold_by.name', read_only=True)
    customer_name = serializers.CharField(source='customer.proprietor_name', read_only=True)

    class Meta:
        model = DraftSaleOrder
        fields = '__all__'
        read_only_fields = ['invoice_number', 'total_amount', 'payment_status']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        total_amount = sum(float(item['unit_price_bdt']) * item['quantity'] for item in items_data)
        validated_data['total_amount'] = total_amount
        draft_order = DraftSaleOrder.objects.create(**validated_data)
        
        for item_data in items_data:
            # Extract multiplier if provided, else set to None
            multiplier = item_data.pop('multiplier', None)
            draft_item = DraftSaleItem.objects.create(draft_order=draft_order, **item_data)
            # If multiplier was provided, update it
            if multiplier is not None:
                draft_item.multiplier = multiplier
                draft_item.save()
                
        return draft_order

    def update(self, instance, validated_data):
        # Remove items from validated_data – handle them manually
        items_data = validated_data.pop('items', [])

        # Update the draft order fields (except read-only ones)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Recalculate total_amount from the incoming items
        total_amount = sum(float(item['unit_price_bdt']) * item['quantity'] for item in items_data)
        instance.total_amount = total_amount
        instance.save()

        # Get existing item IDs
        existing_item_ids = list(instance.items.values_list('id', flat=True))
        new_item_ids = []

        for item_data in items_data:
            # Extract multiplier if provided
            multiplier = item_data.pop('multiplier', None)
            item_id = item_data.get('id', None)
            
            if item_id:
                # Update existing item
                try:
                    item = DraftSaleItem.objects.get(id=item_id, draft_order=instance)
                    # Update fields except 'id' and read-only ones
                    for attr, value in item_data.items():
                        if attr not in ['id', 'total_price_bdt', 'profit_bdt']:
                            setattr(item, attr, value)
                    if multiplier is not None:
                        item.multiplier = multiplier
                    item.save()
                    new_item_ids.append(item.id)
                except DraftSaleItem.DoesNotExist:
                    # If ID provided but not found, treat as a new item
                    item = DraftSaleItem.objects.create(draft_order=instance, **item_data)
                    if multiplier is not None:
                        item.multiplier = multiplier
                        item.save()
                    new_item_ids.append(item.id)
            else:
                # Create new item
                item = DraftSaleItem.objects.create(draft_order=instance, **item_data)
                if multiplier is not None:
                    item.multiplier = multiplier
                    item.save()
                new_item_ids.append(item.id)

        # Delete items that are no longer present
        for item_id in existing_item_ids:
            if item_id not in new_item_ids:
                DraftSaleItem.objects.filter(id=item_id).delete()

        return instance