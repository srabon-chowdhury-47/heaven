from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from sale.models import SaleOrder
from payment.models import Payment
from .models import LedgerEntry

# ---------- Sale ----------
@receiver(post_save, sender=SaleOrder)
def handle_sale_ledger(sender, instance, **kwargs):
    if not instance.customer:
        # If sale has no customer, delete any orphan ledger entry
        LedgerEntry.objects.filter(reference_sale=instance).delete()
        return

    # If customer changed, remove old entry
    old_entry = LedgerEntry.objects.filter(reference_sale=instance).first()
    if old_entry and old_entry.customer != instance.customer:
        old_entry.delete()

    # Create or update the debit entry
    ledger_entry, created = LedgerEntry.objects.get_or_create(
        customer=instance.customer,
        reference_sale=instance,
        defaults={
            'amount': instance.total_amount,
            'transaction_type': 'DEBIT',
            'description': f"Sale #{instance.invoice_number}"
        }
    )
    if not created and ledger_entry.amount != instance.total_amount:
        ledger_entry.amount = instance.total_amount
        ledger_entry.save()

@receiver(post_delete, sender=SaleOrder)
def delete_sale_ledger(sender, instance, **kwargs):
    LedgerEntry.objects.filter(reference_sale=instance).delete()

# ---------- Payment ----------
@receiver(post_save, sender=Payment)
def handle_payment_ledger(sender, instance, **kwargs):
    # Only care about incoming payments linked to a sale with a customer
    if instance.payment_type == 'IN' and instance.sale and instance.sale.customer:
        ledger_entry, created = LedgerEntry.objects.get_or_create(
            customer=instance.sale.customer,
            reference_payment=instance,
            defaults={
                'amount': instance.amount,
                'transaction_type': 'CREDIT',
                'description': f"Payment #{instance.payment_id} for Sale #{instance.sale.invoice_number}"
            }
        )
        if not created and ledger_entry.amount != instance.amount:
            ledger_entry.amount = instance.amount
            ledger_entry.save()
    else:
        # Delete any entry if payment is no longer relevant
        LedgerEntry.objects.filter(reference_payment=instance).delete()

@receiver(post_delete, sender=Payment)
def delete_payment_ledger(sender, instance, **kwargs):
    LedgerEntry.objects.filter(reference_payment=instance).delete()