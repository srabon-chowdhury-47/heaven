import uuid
from django.db import models
from products.models import Product
from person.models import Employee, Customer

class SaleOrder(models.Model):
    # Master Record
    invoice_number = models.CharField(max_length=20, unique=True, editable=False)
    sold_by = models.CharField(max_length=100, blank=True, null=True,
                               help_text="Name of the person who made the sale")
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_history')

    sale_date = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True, null=True)

    # --- Simplified Financials ---
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, editable=False)
    payment_status = models.CharField(max_length=50, default="Unpaid")

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = f"INV-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} - {self.customer.proprietor_name if self.customer else 'Walk-in'}"


class SaleItem(models.Model):
    # Detail Record
    sale_order = models.ForeignKey(SaleOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)

    # NEW: explicit batch this sale line draws from. Nullable so existing rows
    # (created before this feature) and any batch-less sale still work.
    batch = models.ForeignKey(
        'stock.StockBatch', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sale_items', help_text="The specific stock batch this line consumed"
    )

    quantity = models.PositiveIntegerField()
    unit_price_bdt = models.DecimalField(max_digits=12, decimal_places=2)
    multiplier = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                    help_text="Multiplier used to calculate sale price from purchase price")
    total_price_bdt = models.DecimalField(max_digits=14, decimal_places=2, editable=False)

    # Automated Profit Tracking
    profit_bdt = models.DecimalField(max_digits=14, decimal_places=2, editable=False, null=True, blank=True)

    # NEW: snapshot of the actual per-unit cost used for this sale (from the batch,
    # falling back to product.purchase_cost_bdt). Stored so profit history stays
    # accurate even if the batch is later edited or deleted.
    unit_cost_bdt = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, editable=False)

    def save(self, *args, **kwargs):
        self.total_price_bdt = float(self.unit_price_bdt) * float(self.quantity)

        # Determine the cost basis: prefer the linked batch's mrp, fall back to
        # the product's last-known purchase cost.
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