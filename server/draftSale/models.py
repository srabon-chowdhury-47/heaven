import uuid
from django.db import models
from products.models import Product
from person.models import Customer

class DraftSaleOrder(models.Model):
    invoice_number = models.CharField(max_length=20, unique=True, editable=False)
    sold_by = models.CharField(max_length=100, blank=True, null=True,
                               help_text="Name of the person who made the sale")
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name='draft_purchase_history')
    sale_date = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True, null=True)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, editable=False)
    payment_status = models.CharField(max_length=50, default="Unpaid")

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = f"DRF-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} - {self.customer.proprietor_name if self.customer else 'Walk-in'}"


class DraftSaleItem(models.Model):
    draft_order = models.ForeignKey(DraftSaleOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)

    # NEW: which stock batch the user picked at draft time, purely informational.
    # Drafts never touch Stock/StockBatch quantities — no signals, no reservation.
    # This just carries the user's intent forward so it can be reapplied when the
    # draft is later converted into a real Sale (see SaleItem.batch).
    batch = models.ForeignKey(
        'stock.StockBatch', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='draft_sale_items',
        help_text="Batch the user selected at draft time (not consumed; informational only)"
    )

    quantity = models.PositiveIntegerField()
    unit_price_bdt = models.DecimalField(max_digits=12, decimal_places=2)
    multiplier = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                    help_text="Multiplier used to calculate sale price from purchase price")
    total_price_bdt = models.DecimalField(max_digits=14, decimal_places=2, editable=False)
    profit_bdt = models.DecimalField(max_digits=14, decimal_places=2, editable=False, null=True, blank=True)

    # NEW: snapshot of the batch's per-unit cost at draft time (or product's cost
    # if no batch was chosen), so the estimated profit shown on the draft reflects
    # actual batch pricing rather than always product.purchase_cost_bdt.
    unit_cost_bdt = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, editable=False)

    def save(self, *args, **kwargs):
        self.total_price_bdt = float(self.unit_price_bdt) * float(self.quantity)

        # Cost basis: prefer the selected batch's mrp, fall back to product's cost.
        # This is estimation only for drafts — no stock is reserved or deducted.
        cost_basis = None
        if self.batch_id and self.batch:
            cost_basis = self.batch.mrp
        elif self.product and self.product.purchase_cost_bdt:
            cost_basis = self.product.purchase_cost_bdt

        if cost_basis is not None:
            self.unit_cost_bdt = cost_basis
            total_purchase_cost = float(cost_basis) * float(self.quantity)
            self.profit_bdt = self.total_price_bdt - total_purchase_cost

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity}x {self.product.product_name}"