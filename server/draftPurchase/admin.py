from django.contrib import admin
from .models import DraftPurchaseOrder, DraftPurchaseItem

class DraftPurchaseItemInline(admin.TabularInline):
    model = DraftPurchaseItem
    extra = 1
    readonly_fields = ('total_cost_bdt',)
    # Optional: include new fields in the admin display
    fields = ('product', 'quantity', 'unit_cost_bdt', 'discount', 'duty', 'total_cost_bdt')

@admin.register(DraftPurchaseOrder)
class DraftPurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('draft_number', 'total_amount', 'purchase_date')
    search_fields = ('draft_number',)
    readonly_fields = ('draft_number', 'total_amount')
    inlines = [DraftPurchaseItemInline]