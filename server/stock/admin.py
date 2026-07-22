from django.contrib import admin
from .models import Stock, StockBatch


class StockBatchInline(admin.TabularInline):
    model = StockBatch
    extra = 0
    readonly_fields = ('purchase_item', 'mrp', 'quantity', 'original_quantity', 'created_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('product', 'current_quantity', 'last_updated')
    search_fields = ('product__product_name', 'product__part_number')
    readonly_fields = ('product', 'current_quantity', 'last_updated')
    inlines = [StockBatchInline]

    def has_add_permission(self, request):
        return False


@admin.register(StockBatch)
class StockBatchAdmin(admin.ModelAdmin):
    list_display = ('product', 'mrp', 'quantity', 'original_quantity', 'created_at')
    search_fields = ('product__product_name', 'product__part_number')
    list_filter = ('product__brand',)
    readonly_fields = ('stock', 'product', 'purchase_item', 'mrp', 'quantity', 'original_quantity', 'created_at', 'updated_at')

    def has_add_permission(self, request):
        return False