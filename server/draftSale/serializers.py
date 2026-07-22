from rest_framework import serializers
from .models import DraftSaleOrder, DraftSaleItem
from stock.models import StockBatch


class DraftSaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    part_number = serializers.CharField(source='product.part_number', read_only=True)
    purchase_price_bdt = serializers.SerializerMethodField()

    # Accept batch id from frontend; not required — drafts can exist without a
    # chosen batch (e.g. product has no stock yet, or user hasn't picked one).
    batch_id = serializers.PrimaryKeyRelatedField(
        source='batch', queryset=StockBatch.objects.all(), required=False, allow_null=True
    )
    batch_mrp = serializers.DecimalField(
        source='batch.mrp', max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = DraftSaleItem
        fields = [
            'id', 'product', 'product_name', 'part_number', 'purchase_price_bdt',
            'quantity', 'unit_price_bdt', 'multiplier', 'total_price_bdt', 'profit_bdt',
            'batch_id', 'batch_mrp', 'unit_cost_bdt',
        ]
        read_only_fields = ['total_price_bdt', 'profit_bdt', 'unit_cost_bdt']

    def get_purchase_price_bdt(self, obj):
        # Prefer the snapshotted batch cost; fall back to product's current cost
        if obj.unit_cost_bdt is not None:
            return obj.unit_cost_bdt
        if obj.batch_id and obj.batch:
            return obj.batch.mrp
        return obj.product.purchase_cost_bdt

    def validate(self, data):
        """Validate that multiplier and unit_price are consistent, and that a
        chosen batch (if any) actually belongs to the selected product."""
        batch = data.get('batch')
        product = data.get('product')
        if batch is not None and product is not None and batch.product_id != product.id:
            raise serializers.ValidationError(
                f"Selected batch does not belong to {product.product_name}."
            )
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
            multiplier = item_data.pop('multiplier', None)
            draft_item = DraftSaleItem.objects.create(draft_order=draft_order, **item_data)
            if multiplier is not None:
                draft_item.multiplier = multiplier
                draft_item.save()

        return draft_order

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
                    item = DraftSaleItem.objects.get(id=item_id, draft_order=instance)
                    for attr, value in item_data.items():
                        if attr not in ['id', 'total_price_bdt', 'profit_bdt', 'unit_cost_bdt']:
                            setattr(item, attr, value)
                    if multiplier is not None:
                        item.multiplier = multiplier
                    item.save()
                    new_item_ids.append(item.id)
                except DraftSaleItem.DoesNotExist:
                    item = DraftSaleItem.objects.create(draft_order=instance, **item_data)
                    if multiplier is not None:
                        item.multiplier = multiplier
                        item.save()
                    new_item_ids.append(item.id)
            else:
                item = DraftSaleItem.objects.create(draft_order=instance, **item_data)
                if multiplier is not None:
                    item.multiplier = multiplier
                    item.save()
                new_item_ids.append(item.id)

        for item_id in existing_item_ids:
            if item_id not in new_item_ids:
                DraftSaleItem.objects.filter(id=item_id).delete()

        return instance