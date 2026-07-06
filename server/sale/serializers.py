from rest_framework import serializers
from .models import SaleOrder, SaleItem
from stock.models import Stock

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    part_number = serializers.CharField(source='product.part_number', read_only=True)
    purchase_price_bdt = serializers.DecimalField(source='product.purchase_cost_bdt', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'part_number', 'purchase_price_bdt',
                 'quantity', 'unit_price_bdt', 'multiplier', 'total_price_bdt', 'profit_bdt']
        read_only_fields = ['total_price_bdt', 'profit_bdt']

class SaleOrderSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    sold_by_name = serializers.CharField(source='sold_by.name', read_only=True)
    customer_name = serializers.CharField(source='customer.proprietor_name', read_only=True)

    class Meta:
        model = SaleOrder
        fields = '__all__'
        read_only_fields = ['invoice_number', 'total_amount', 'payment_status']

    def validate(self, data):
        """
        SECURITY CHECK: Prevent selling products if there is not enough stock.
        """
        items = data.get('items', [])
        for item in items:
            product = item['product']
            requested_qty = item['quantity']

            try:
                stock = Stock.objects.get(product=product)
                if stock.current_quantity < requested_qty:
                    raise serializers.ValidationError(
                        f"Not enough stock for {product.product_name}. Available: {stock.current_quantity}, Requested: {requested_qty}."
                    )
            except Stock.DoesNotExist:
                raise serializers.ValidationError(
                    f"No stock record found for {product.product_name}. You must purchase it first."
                )

        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Auto-sum the grand total based on the items sent from React
        total_amount = sum(float(item['unit_price_bdt']) * item['quantity'] for item in items_data)
        validated_data['total_amount'] = total_amount

        sale_order = SaleOrder.objects.create(**validated_data)
        
        for item_data in items_data:
            # Extract multiplier if provided
            multiplier = item_data.pop('multiplier', None)
            sale_item = SaleItem.objects.create(sale_order=sale_order, **item_data)
            # If multiplier was provided, update it
            if multiplier is not None:
                sale_item.multiplier = multiplier
                sale_item.save()
            
        return sale_order

    def update(self, instance, validated_data):
        # Remove items from validated_data – handle them manually
        items_data = validated_data.pop('items', [])

        # Update the sale order fields (except read-only ones)
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
                    item = SaleItem.objects.get(id=item_id, sale_order=instance)
                    # Update fields except 'id' and read-only ones
                    for attr, value in item_data.items():
                        if attr not in ['id', 'total_price_bdt', 'profit_bdt']:
                            setattr(item, attr, value)
                    if multiplier is not None:
                        item.multiplier = multiplier
                    item.save()
                    new_item_ids.append(item.id)
                except SaleItem.DoesNotExist:
                    # If ID provided but not found, treat as a new item
                    item = SaleItem.objects.create(sale_order=instance, **item_data)
                    if multiplier is not None:
                        item.multiplier = multiplier
                        item.save()
                    new_item_ids.append(item.id)
            else:
                # Create new item
                item = SaleItem.objects.create(sale_order=instance, **item_data)
                if multiplier is not None:
                    item.multiplier = multiplier
                    item.save()
                new_item_ids.append(item.id)

        # Delete items that are no longer present
        for item_id in existing_item_ids:
            if item_id not in new_item_ids:
                SaleItem.objects.filter(id=item_id).delete()

        return instance