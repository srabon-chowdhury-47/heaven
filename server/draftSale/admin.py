from django.contrib import admin
from .models import DraftSaleOrder, DraftSaleItem
from stock.models import Stock


class DraftSaleItemInline(admin.TabularInline):
    model = DraftSaleItem
    extra = 1
    readonly_fields = ('current_stock_display', 'total_price_bdt', 'profit_bdt')
    fields = ('product', 'batch', 'quantity', 'unit_price_bdt', 'multiplier',
               'total_price_bdt', 'profit_bdt', 'current_stock_display')

    def current_stock_display(self, obj):
        if obj.product:
            try:
                return obj.product.inventory_stock.current_quantity
            except:
                return "0"
        return "Save to view"
    current_stock_display.short_description = "Stock Left"


@admin.register(DraftSaleOrder)
class DraftSaleOrderAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'customer', 'total_amount', 'payment_status', 'sale_date')
    search_fields = ('invoice_number', 'customer__proprietor_name', 'customer__shop_name')
    list_filter = ('payment_status',)
    readonly_fields = ('invoice_number', 'total_amount')
    inlines = [DraftSaleItemInline]