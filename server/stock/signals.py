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
        # brand new purchase line -> brand new batch at this price
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
        # Edited an existing purchase line. Adjust the linked batch directly
        # (rather than touching arbitrary FIFO batches), then reconcile Stock total.
        old_qty = getattr(instance, '_old_quantity', 0)
        difference = instance.quantity - old_qty

        batch = StockBatch.objects.filter(purchase_item=instance).first()
        if batch:
            # keep batch qty in sync with this purchase line's edits
            batch.quantity += difference
            batch.original_quantity += difference
            batch.mrp = instance.unit_cost_bdt  # price correction on this batch
            if batch.quantity < 0:
                batch.quantity = 0
            batch.save(update_fields=['quantity', 'original_quantity', 'mrp', 'updated_at'])
        else:
            # No batch found (e.g. legacy data) — create one to represent the edit
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
    # batch cleans itself up: purchase_item FK is SET_NULL, batch row remains
    # as a historical record but is no longer linked. If you'd rather delete it:
    StockBatch.objects.filter(purchase_item=instance).delete()


# ---------- 3. SALE: deduct stock FIFO across batches ----------
@receiver(pre_save, sender=SaleItem)
def capture_old_sale_qty(sender, instance, **kwargs):
    if instance.pk:
        instance._old_quantity = SaleItem.objects.get(pk=instance.pk).quantity
    else:
        instance._old_quantity = 0


def _consume_fifo(product, qty_to_consume):
    """Deduct qty_to_consume from oldest batches first. Returns leftover if stock insufficient."""
    batches = StockBatch.objects.filter(product=product, quantity__gt=0).order_by('created_at')
    remaining = qty_to_consume
    for batch in batches:
        if remaining <= 0:
            break
        take = min(batch.quantity, remaining)
        batch.quantity -= take
        batch.save(update_fields=['quantity', 'updated_at'])
        remaining -= take
    return remaining  # >0 means we ran out of batches (oversold / negative stock)


def _restore_fifo(product, qty_to_restore):
    """Restore qty back into the most recently touched (newest) batch that has room,
    falling back to creating an adjustment batch at last-known cost if none exist."""
    batch = StockBatch.objects.filter(product=product).order_by('-created_at').first()
    if batch and batch.original_quantity > 0:
        batch.quantity = min(batch.quantity + qty_to_restore, batch.original_quantity + qty_to_restore)
        batch.save(update_fields=['quantity', 'updated_at'])
    else:
        # No batch exists at all — create an adjustment batch using product's last cost
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
        _consume_fifo(instance.product, instance.quantity)
    else:
        old_qty = getattr(instance, '_old_quantity', 0)
        difference = instance.quantity - old_qty  # positive = selling more, negative = selling less

        stock.current_quantity -= difference
        stock.save(update_fields=['current_quantity', 'last_updated'])

        if difference > 0:
            _consume_fifo(instance.product, difference)
        elif difference < 0:
            _restore_fifo(instance.product, -difference)


@receiver(post_delete, sender=SaleItem)
@transaction.atomic
def revert_stock_on_sale_delete(sender, instance, **kwargs):
    try:
        stock = Stock.objects.get(product=instance.product)
        stock.current_quantity += instance.quantity
        stock.save(update_fields=['current_quantity', 'last_updated'])
    except Stock.DoesNotExist:
        return
    _restore_fifo(instance.product, instance.quantity)