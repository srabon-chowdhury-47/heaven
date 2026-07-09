# purchase/admin.py
from django.contrib import admin
from django.contrib import messages
from .models import PurchaseOrder, PurchaseItem

class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 1
    readonly_fields = ('total_cost_bdt',)
    
    def save_model(self, request, obj, form, change):
        """Override to ensure product cost update when saving from admin"""
        super().save_model(request, obj, form, change)
        # Product cost will be updated via the model's save() method

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_number', 'supplier', 'total_amount', 'payment_status', 'purchase_date')
    search_fields = ('po_number', 'supplier__name')
    list_filter = ('payment_status',)
    readonly_fields = ('po_number', 'total_amount')
    inlines = [PurchaseItemInline]
    
    def save_model(self, request, obj, form, change):
        """Override to ensure product cost update when saving from admin"""
        super().save_model(request, obj, form, change)
        messages.success(request, f"Purchase Order {obj.po_number} saved successfully!")