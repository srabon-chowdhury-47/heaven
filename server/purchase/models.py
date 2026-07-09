# purchase/models.py
import uuid
from django.db import models
from products.models import Product
from supplier.models import Supplier

class PurchaseOrder(models.Model):
    # Master Record
    po_number = models.CharField(max_length=20, unique=True, editable=False)
    entry_by = models.CharField(max_length=100, blank=True, null=True)  # Changed to CharField
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchase_orders', null=True, blank=True) 
    
    purchase_date = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True, null=True)

    # --- Simplified Financials ---
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, editable=False)
    payment_status = models.CharField(max_length=50, default="Unpaid")

    def save(self, *args, **kwargs):
        if not self.po_number:
            self.po_number = f"PO-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.po_number} - {self.supplier.name if self.supplier else 'Unknown'}"


class PurchaseItem(models.Model):
    # Detail Record
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT) 
    
    quantity = models.PositiveIntegerField()
    unit_cost_bdt = models.DecimalField(max_digits=12, decimal_places=2)
    total_cost_bdt = models.DecimalField(max_digits=14, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        # Calculate total cost
        self.total_cost_bdt = float(self.unit_cost_bdt) * float(self.quantity)
        
        # Save the purchase item
        super().save(*args, **kwargs)
        
        # 🔥 UPDATE PRODUCT PURCHASE COST 🔥
        try:
            product = self.product
            # Update the product's purchase cost with the new unit cost
            product.purchase_cost_bdt = self.unit_cost_bdt
            product.save(update_fields=['purchase_cost_bdt'])
        except Product.DoesNotExist:
            pass  # Product might have been deleted

    def __str__(self):
        return f"{self.quantity}x {self.product.product_name}"