from decimal import Decimal
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.db import transaction

from products.models import Product
from purchase.models import PurchaseItem
from sale.models import SaleItem
from .models import Stock, StockBatch


# ---------- 1. Init stock row on new product ----------
@receiver(post_save, sender=Product)
def initialize_stock(sender, instance, created, **kwargs):
    if created:
        Stock.objects.create(product=instance, current_quantity=0)


# ---------- 2. PURCHASE: add stock + create a batch at that price ----------
@receiver(pre_save, sender=PurchaseItem)
def capture_old_purchase_qty(sender, instance, **kwargs):
    if instance.pk:
        old = PurchaseItem.objects.get(pk=instance.pk)
        instance._old_quantity = old.quantity
        instance._old_unit_cost = old.unit_cost_bdt
    else:
        instance._old_quantity = 0
        instance._old_unit_cost = None


@receiver(post_save, sender=PurchaseItem)
@transaction.atomic
def add_to_stock(sender, instance, created, **kwargs):
    stock, _ = Stock.objects.get_or_create(product=instance.product)

    if created:
        stock.current_quantity += instance.quantity
        stock.save(update_fields=['current_quantity', 'last_updated'])

        StockBatch.objects.create(
            stock=stock,
            product=instance.product,
            purchase_item=instance,
            mrp=instance.unit_cost_bdt,
            quantity=instance.quantity,
            original_quantity=instance.quantity,
        )
    else:
        old_qty = getattr(instance, '_old_quantity', 0)
        difference = instance.quantity - old_qty

        batch = StockBatch.objects.filter(purchase_item=instance).first()
        if batch:
            batch.quantity += difference
            batch.original_quantity += difference
            batch.mrp = instance.unit_cost_bdt
            if batch.quantity < 0:
                batch.quantity = 0
            batch.save(update_fields=['quantity', 'original_quantity', 'mrp', 'updated_at'])
        else:
            StockBatch.objects.create(
                stock=stock,
                product=instance.product,
                purchase_item=instance,
                mrp=instance.unit_cost_bdt,
                quantity=max(instance.quantity, 0),
                original_quantity=instance.quantity,
            )

        stock.current_quantity += difference
        stock.save(update_fields=['current_quantity', 'last_updated'])


@receiver(post_delete, sender=PurchaseItem)
@transaction.atomic
def revert_stock_on_purchase_delete(sender, instance, **kwargs):
    try:
        stock = Stock.objects.get(product=instance.product)
        stock.current_quantity -= instance.quantity
        stock.save(update_fields=['current_quantity', 'last_updated'])
    except Stock.DoesNotExist:
        pass
    StockBatch.objects.filter(purchase_item=instance).delete()


# ---------- 3. SALE: deduct stock from the SPECIFIC batch chosen, or FIFO if none given ----------
@receiver(pre_save, sender=SaleItem)
def capture_old_sale_state(sender, instance, **kwargs):
    if instance.pk:
        old = SaleItem.objects.get(pk=instance.pk)
        instance._old_quantity = old.quantity
        instance._old_batch_id = old.batch_id
    else:
        instance._old_quantity = 0
        instance._old_batch_id = None


def _consume_specific_batch(batch, qty_to_consume):
    """Deduct qty_to_consume from a specific batch. Returns leftover if batch
    doesn't have enough (caller decides whether to overflow into FIFO or allow negative)."""
    take = min(batch.quantity, qty_to_consume)
    batch.quantity -= take
    batch.save(update_fields=['quantity', 'updated_at'])
    return qty_to_consume - take  # >0 means the chosen batch ran short


def _consume_fifo(product, qty_to_consume, exclude_batch_id=None):
    """Deduct qty_to_consume from oldest batches first (fallback path when no
    specific batch was chosen, or to cover overflow beyond a chosen batch)."""
    qs = StockBatch.objects.filter(product=product, quantity__gt=0).order_by('created_at')
    if exclude_batch_id:
        qs = qs.exclude(pk=exclude_batch_id)
    remaining = qty_to_consume
    for batch in qs:
        if remaining <= 0:
            break
        take = min(batch.quantity, remaining)
        batch.quantity -= take
        batch.save(update_fields=['quantity', 'updated_at'])
        remaining -= take
    return remaining


def _restore_to_batch(batch, qty_to_restore):
    """Restore qty back into a specific batch, capped at its original_quantity."""
    if not batch:
        return qty_to_restore
    room = max(batch.original_quantity - batch.quantity, 0)
    give_back = min(room, qty_to_restore)
    batch.quantity += give_back
    batch.save(update_fields=['quantity', 'updated_at'])
    return qty_to_restore - give_back  # leftover that didn't fit


def _restore_fifo(product, qty_to_restore):
    """Restore qty into the most recently touched batch, or create an adjustment
    batch at the product's last known cost if nothing exists."""
    batch = StockBatch.objects.filter(product=product).order_by('-created_at').first()
    if batch:
        leftover = _restore_to_batch(batch, qty_to_restore)
        if leftover > 0:
            # batch was already full — bump its original_quantity to absorb the rest
            batch.original_quantity += leftover
            batch.quantity += leftover
            batch.save(update_fields=['original_quantity', 'quantity', 'updated_at'])
    else:
        stock = Stock.objects.get(product=product)
        StockBatch.objects.create(
            stock=stock,
            product=product,
            mrp=product.purchase_cost_bdt or 0,
            quantity=qty_to_restore,
            original_quantity=qty_to_restore,
        )


@receiver(post_save, sender=SaleItem)
@transaction.atomic
def deduct_from_stock(sender, instance, created, **kwargs):
    stock, _ = Stock.objects.get_or_create(product=instance.product)

    if created:
        stock.current_quantity -= instance.quantity
        stock.save(update_fields=['current_quantity', 'last_updated'])

        if instance.batch_id:
            overflow = _consume_specific_batch(instance.batch, instance.quantity)
            if overflow > 0:
                # chosen batch didn't have enough — cover the rest via FIFO
                # from other batches (keeps total_quantity accurate even if
                # frontend's batch snapshot was stale)
                _consume_fifo(instance.product, overflow, exclude_batch_id=instance.batch_id)
        else:
            _consume_fifo(instance.product, instance.quantity)

    else:
        old_qty = getattr(instance, '_old_quantity', 0)
        old_batch_id = getattr(instance, '_old_batch_id', None)
        qty_diff = instance.quantity - old_qty
        batch_changed = old_batch_id != instance.batch_id

        stock.current_quantity -= qty_diff
        stock.save(update_fields=['current_quantity', 'last_updated'])

        if batch_changed:
            # Fully reverse the old allocation, then apply the new one fresh
            if old_batch_id:
                old_batch = StockBatch.objects.filter(pk=old_batch_id).first()
                if old_batch:
                    _restore_to_batch(old_batch, old_qty)
            else:
                _restore_fifo(instance.product, old_qty)

            if instance.batch_id:
                overflow = _consume_specific_batch(instance.batch, instance.quantity)
                if overflow > 0:
                    _consume_fifo(instance.product, overflow, exclude_batch_id=instance.batch_id)
            else:
                _consume_fifo(instance.product, instance.quantity)
        else:
            # Same batch, just quantity changed
            if qty_diff > 0:
                if instance.batch_id:
                    overflow = _consume_specific_batch(instance.batch, qty_diff)
                    if overflow > 0:
                        _consume_fifo(instance.product, overflow, exclude_batch_id=instance.batch_id)
                else:
                    _consume_fifo(instance.product, qty_diff)
            elif qty_diff < 0:
                if instance.batch_id:
                    _restore_to_batch(instance.batch, -qty_diff)
                else:
                    _restore_fifo(instance.product, -qty_diff)


@receiver(post_delete, sender=SaleItem)
@transaction.atomic
def revert_stock_on_sale_delete(sender, instance, **kwargs):
    try:
        stock = Stock.objects.get(product=instance.product)
        stock.current_quantity += instance.quantity
        stock.save(update_fields=['current_quantity', 'last_updated'])
    except Stock.DoesNotExist:
        return

    if instance.batch_id:
        batch = StockBatch.objects.filter(pk=instance.batch_id).first()
        if batch:
            leftover = _restore_to_batch(batch, instance.quantity)
            if leftover > 0:
                _restore_fifo(instance.product, leftover)
        else:
            _restore_fifo(instance.product, instance.quantity)
    else:
        _restore_fifo(instance.product, instance.quantity)