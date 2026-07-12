from django.db import models
from person.models import Customer
from sale.models import SaleOrder
from payment.models import Payment

class LedgerEntry(models.Model):
    TRANSACTION_TYPES = (
        ('DEBIT', 'Debit'),   # Customer owes us (sale)
        ('CREDIT', 'Credit'), # Customer pays us (payment)
    )

    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name='ledger_entries'
    )
    transaction_date = models.DateTimeField(auto_now_add=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)   # always positive
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    reference_sale = models.ForeignKey(
        SaleOrder, on_delete=models.SET_NULL, null=True, blank=True
    )
    reference_payment = models.ForeignKey(
        Payment, on_delete=models.SET_NULL, null=True, blank=True
    )
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['transaction_date']
        # Prevent duplicate entries for same sale or payment
        constraints = [
            models.UniqueConstraint(
                fields=['customer', 'reference_sale'],
                condition=models.Q(reference_sale__isnull=False),
                name='unique_sale_ledger'
            ),
            models.UniqueConstraint(
                fields=['customer', 'reference_payment'],
                condition=models.Q(reference_payment__isnull=False),
                name='unique_payment_ledger'
            ),
        ]

    def __str__(self):
        return f"{self.customer} - {self.transaction_type} - {self.amount}"