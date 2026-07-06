from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet
from .models import SaleOrder, SaleItem
from stock.models import Stock

# --- ADMIN SECURITY: Block over-selling from the Dashboard ---
class SaleItemFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()
        for form in self.forms:
            # Skip if the form has basic errors or is marked for deletion
            if not form.is_valid() or form.cleaned_data.get('DELETE'):
                continue
                
            product = form.cleaned_data.get('product')
            requested_qty = form.cleaned_data.get('quantity')
            
            if product and requested_qty:
                # If editing an existing sale, calculate the true available stock
                instance = form.instance
                old_qty = 0
                if instance.pk:
                    old_qty = SaleItem.objects.get(pk=instance.pk).quantity
                
                try:
                    stock = Stock.objects.get(product=product)
                    # Real availability = what's on the shelf right now + what was already reserved for this exact order line
                    true_available = stock.current_quantity + old_qty
                    
                    if true_available < requested_qty:
                        raise ValidationError(
                            f"Over-sell Alert! You only have {true_available}x '{product.product_name}' available to sell."
                        )
                except Stock.DoesNotExist:
                    raise ValidationError(f"No stock record found for {product.product_name}.")


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 1
    formset = SaleItemFormSet  # Attach the security check
    
    # Add our custom stock display column
    readonly_fields = ('current_stock_display', 'total_price_bdt', 'profit_bdt')
    fields = ('product', 'quantity', 'unit_price_bdt', 'multiplier', 'total_price_bdt', 'profit_bdt', 'current_stock_display')
    
    # Custom column to show live stock
    def current_stock_display(self, obj):
        if obj.product:
            try:
                return obj.product.inventory_stock.current_quantity
            except:
                return "0"
        return "Save to view"
    
    current_stock_display.short_description = "Stock Left"


@admin.register(SaleOrder)
class SaleOrderAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'customer', 'total_amount', 'payment_status', 'sale_date')
    search_fields = ('invoice_number', 'customer__proprietor_name', 'customer__shop_name')
    list_filter = ('payment_status',)
    
    readonly_fields = ('invoice_number', 'total_amount')
    inlines = [SaleItemInline]