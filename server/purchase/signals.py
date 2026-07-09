# purchase/signals.py
from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from .models import PurchaseItem, PurchaseOrder
from products.models import Product

@receiver(post_save, sender=PurchaseItem)
def update_product_purchase_cost_on_save(sender, instance, created, **kwargs):
    """
    Update product's purchase cost when purchase item is saved
    This works alongside the save() method override for extra safety
    """
    try:
        product = instance.product
        # Only update if the unit cost has changed
        if product.purchase_cost_bdt != instance.unit_cost_bdt:
            product.purchase_cost_bdt = instance.unit_cost_bdt
            product.save(update_fields=['purchase_cost_bdt'])
            print(f"✅ Updated {product.part_number} purchase cost to {instance.unit_cost_bdt} BDT")
    except Product.DoesNotExist:
        pass

@receiver(post_delete, sender=PurchaseItem)
def handle_product_cost_on_item_delete(sender, instance, **kwargs):
    """
    When a purchase item is deleted, optionally revert to latest purchase cost
    """
    try:
        product = instance.product
        # Get the latest purchase for this product
        latest_purchase = PurchaseItem.objects.filter(
            product=product
        ).exclude(id=instance.id).order_by('-purchase_order__purchase_date').first()
        
        if latest_purchase:
            # Update to the latest available purchase cost
            product.purchase_cost_bdt = latest_purchase.unit_cost_bdt
        else:
            # No purchase history, set to 0
            product.purchase_cost_bdt = 0
        product.save(update_fields=['purchase_cost_bdt'])
    except Product.DoesNotExist:
        pass