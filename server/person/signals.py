from django.db.models import Sum
from person.models import Customer

@receiver(post_save, sender=LedgerEntry)
@receiver(post_delete, sender=LedgerEntry)
def update_customer_balance(sender, instance, **kwargs):
    customer = instance.customer
    total_debit = LedgerEntry.objects.filter(
        customer=customer, transaction_type='DEBIT'
    ).aggregate(total=Sum('amount'))['total'] or 0
    total_credit = LedgerEntry.objects.filter(
        customer=customer, transaction_type='CREDIT'
    ).aggregate(total=Sum('amount'))['total'] or 0
    # Balance = credits (payments) – debits (sales) → positive means overpaid, negative means due
    customer.balance = total_credit - total_debit
    customer.save(update_fields=['balance'])