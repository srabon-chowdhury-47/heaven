import uuid
from django.db import models
from products.models import Product
from person.models import Employee, Customer

class DraftSaleOrder(models.Model):
    invoice_number = models.CharField(max_length=20, unique=True, editable=False)
    sold_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='draft_sales_made')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='draft_purchase_history')
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
    quantity = models.PositiveIntegerField()
    unit_price_bdt = models.DecimalField(max_digits=12, decimal_places=2)
    multiplier = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, 
                                    help_text="Multiplier used to calculate sale price from purchase price")
    total_price_bdt = models.DecimalField(max_digits=14, decimal_places=2, editable=False)
    profit_bdt = models.DecimalField(max_digits=14, decimal_places=2, editable=False, null=True, blank=True)

    def save(self, *args, **kwargs):
        self.total_price_bdt = float(self.unit_price_bdt) * float(self.quantity)
        if self.product and self.product.purchase_cost_bdt:
            total_purchase_cost = float(self.product.purchase_cost_bdt) * float(self.quantity)
            self.profit_bdt = self.total_price_bdt - total_purchase_cost
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity}x {self.product.product_name}"