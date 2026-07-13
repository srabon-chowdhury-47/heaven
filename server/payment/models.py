import uuid
from decimal import Decimal
from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from person.models import Employee

class Payment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ('IN', 'Payment Received (Sale)'),
        ('OUT', 'Payment Paid (Purchase)'),
    ]
    METHOD_CHOICES = [
        ('Cash', 'Cash'),
        ('Bank', 'Bank Transfer'),
        ('Bkash', 'bKash'),
        ('Nagad', 'Nagad'),
        ('Rocket', 'Rocket'),
    ]

    payment_id = models.CharField(max_length=30, unique=True, editable=False)
    payment_type = models.CharField(max_length=10, choices=PAYMENT_TYPE_CHOICES)
    
    sale = models.ForeignKey('sale.SaleOrder', on_delete=models.CASCADE, null=True, blank=True, related_name='payments')
    purchase = models.ForeignKey('purchase.PurchaseOrder', on_delete=models.CASCADE, null=True, blank=True, related_name='payments')
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='Cash')
    handled_by = models.CharField(max_length=100, blank=True, null=True, 
                               help_text="Name of the person who made the payment")
    
    # --- BANK SPECIFI FIELDS ---
    bank_account_number = models.CharField(max_length=50, blank=True, null=True)
    bank_account_name = models.CharField(max_length=100, blank=True, null=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    bank_branch_name = models.CharField(max_length=100, blank=True, null=True)
    bank_routing_number = models.CharField(max_length=50, blank=True, null=True)

    # --- MFS (Mobile Financial Service) SPECIFIC FIELDS ---
    mfs_mobile_number = models.CharField(max_length=20, blank=True, null=True)
    
    # Universal Transaction ID (used for Checks or MFS TrxID)
    transaction_id = models.CharField(max_length=100, null=True, blank=True, help_text="Txn ID or Check Number")
    
    payment_date = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.payment_id:
            self.payment_id = f"PAY-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.payment_id} | {self.payment_type} | {self.amount}"

# --- AUTOMATIC STATUS UPDATER ---
@receiver(post_save, sender=Payment)
@receiver(post_delete, sender=Payment)
def update_order_payment_status(sender, instance, **kwargs):
    order = None
    if instance.sale:
        order = instance.sale
    elif instance.purchase:
        order = instance.purchase
    
    if not order:
        return

    total_paid = order.payments.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
    total_amount = Decimal(str(order.total_amount))

    if total_paid >= total_amount:
        order.payment_status = 'Paid'
    elif total_paid > 0:
        order.payment_status = 'Partial'
    else:
        order.payment_status = 'Unpaid'
        
    order.save(update_fields=['payment_status'])