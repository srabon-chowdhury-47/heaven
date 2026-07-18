import uuid
from django.db import models
from products.models import Product

class DraftPurchaseOrder(models.Model):
    draft_number = models.CharField(max_length=20, unique=True, editable=False)
    entry_by = models.CharField(max_length=100, blank=True, null=True)
    purchase_date = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True, null=True)

    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, editable=False)

    def save(self, *args, **kwargs):
        if not self.draft_number:
            self.draft_number = f"DR-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.draft_number} - Draft"


class DraftPurchaseItem(models.Model):
    draft_order = models.ForeignKey(DraftPurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)

    quantity = models.PositiveIntegerField()
    unit_cost_bdt = models.DecimalField(max_digits=12, decimal_places=2)
    total_cost_bdt = models.DecimalField(max_digits=14, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        self.total_cost_bdt = float(self.unit_cost_bdt) * float(self.quantity)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity}x {self.product.product_name}"