from rest_framework import serializers
from .models import SaleOrder, SaleItem
from stock.models import Stock, StockBatch


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    part_number = serializers.CharField(source='product.part_number', read_only=True)
    purchase_price_bdt = serializers.SerializerMethodField()

    # Accept the batch id from the frontend; not required, so old flows / no-batch
    # products still work. Write-only on input, but we also expose read-only info.
    batch_id = serializers.PrimaryKeyRelatedField(
        source='batch', queryset=StockBatch.objects.all(), required=False, allow_null=True
    )
    batch_mrp = serializers.DecimalField(
        source='batch.mrp', max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = SaleItem
        fields = [
            'id', 'product', 'product_name', 'part_number', 'purchase_price_bdt',
            'quantity', 'unit_price_bdt', 'multiplier', 'total_price_bdt', 'profit_bdt',
            'batch_id', 'batch_mrp', 'unit_cost_bdt',
        ]
        read_only_fields = ['total_price_bdt', 'profit_bdt', 'unit_cost_bdt']

    def get_purchase_price_bdt(self, obj):
        # Prefer the actual batch cost used; fall back to product's current cost
        if obj.unit_cost_bdt is not None:
            return obj.unit_cost_bdt
        if obj.batch_id and obj.batch:
            return obj.batch.mrp
        return obj.product.purchase_cost_bdt


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
        SECURITY CHECK: Prevent selling products if there is not enough stock,
        and if a specific batch is chosen, make sure that batch actually has enough.
        """
        items = data.get('items', [])
        for item in items:
            product = item['product']
            requested_qty = item['quantity']
            batch = item.get('batch')

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

            if batch is not None:
                if batch.product_id != product.id:
                    raise serializers.ValidationError(
                        f"Selected batch does not belong to {product.product_name}."
                    )
                # Soft check only — if stale, the signal falls back to FIFO for the
                # overflow, so this is a friendly warning rather than a hard block.
                if batch.quantity < requested_qty:
                    raise serializers.ValidationError(
                        f"Selected batch for {product.product_name} only has {batch.quantity} left "
                        f"(requested {requested_qty}). Please refresh and pick another batch."
                    )

        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items')

        total_amount = sum(float(item['unit_price_bdt']) * item['quantity'] for item in items_data)
        validated_data['total_amount'] = total_amount

        sale_order = SaleOrder.objects.create(**validated_data)

        for item_data in items_data:
            multiplier = item_data.pop('multiplier', None)
            sale_item = SaleItem.objects.create(sale_order=sale_order, **item_data)
            if multiplier is not None:
                sale_item.multiplier = multiplier
                sale_item.save()

        return sale_order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        total_amount = sum(float(item['unit_price_bdt']) * item['quantity'] for item in items_data)
        instance.total_amount = total_amount
        instance.save()

        existing_item_ids = list(instance.items.values_list('id', flat=True))
        new_item_ids = []

        for item_data in items_data:
            multiplier = item_data.pop('multiplier', None)
            item_id = item_data.get('id', None)

            if item_id:
                try:
                    item = SaleItem.objects.get(id=item_id, sale_order=instance)
                    for attr, value in item_data.items():
                        if attr not in ['id', 'total_price_bdt', 'profit_bdt', 'unit_cost_bdt']:
                            setattr(item, attr, value)
                    if multiplier is not None:
                        item.multiplier = multiplier
                    item.save()
                    new_item_ids.append(item.id)
                except SaleItem.DoesNotExist:
                    item = SaleItem.objects.create(sale_order=instance, **item_data)
                    if multiplier is not None:
                        item.multiplier = multiplier
                        item.save()
                    new_item_ids.append(item.id)
            else:
                item = SaleItem.objects.create(sale_order=instance, **item_data)
                if multiplier is not None:
                    item.multiplier = multiplier
                    item.save()
                new_item_ids.append(item.id)

        for item_id in existing_item_ids:
            if item_id not in new_item_ids:
                SaleItem.objects.filter(id=item_id).delete()

        return instance