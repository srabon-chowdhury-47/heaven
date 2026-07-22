from django.db import models
from products.models import Product


class Stock(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='inventory_stock')
    current_quantity = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product.product_name}: {self.current_quantity} in stock"


class StockBatch(models.Model):
    """
    One line per purchase-rate. Same product can have multiple batches
    at different mrp (per-unit purchase price).
    e.g. Product A: 15 units @ 500, 10 units @ 450 -> two StockBatch rows.
    Consumed FIFO (oldest batch first) when a sale happens.
    """
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='batches')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_batches')

    purchase_item = models.ForeignKey(
        'purchase.PurchaseItem', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='stock_batches', help_text="Originating purchase line, if any"
    )

    mrp = models.DecimalField(max_digits=12, decimal_places=2, help_text="Per-unit purchase price for this batch")
    quantity = models.PositiveIntegerField(help_text="Remaining quantity in this batch")
    original_quantity = models.PositiveIntegerField(help_text="Quantity this batch started with")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']  # FIFO order
        indexes = [
            models.Index(fields=['product', 'created_at']),
        ]

    def __str__(self):
        return f"{self.product.product_name}: {self.quantity}/{self.original_quantity} @ {self.mrp}"