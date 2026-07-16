from django.contrib import admin
from .models import Product

class ProductAdmin(admin.ModelAdmin):
    # --- 1. The Master Table View (All Fields Visible) ---
    list_display = (
        'product_id', 'part_number', 'product_name', 'brand', 'weight', 'category', 
        'source', 'product_status', 'stock_status',
        'purchase_cost_bdt', 'wholesale_price_bdt', 'retail_price_bdt', 
        'mrp_inr', 'markup_percentage', 
        'unit', 'alternative_units', 'barcode', 
        'min_stock_level', 'reorder_point', 'max_stock_level',
        'warranty_period', 'vat_code'
    )
    
    # --- 2. Search & Filtering ---
    search_fields = ('product_id', 'part_number', 'product_name', 'brand', 'barcode')
    list_filter = ('source', 'product_status', 'brand', 'category')
    
    # Set auto-generated fields to read-only so Django doesn't hide them
    readonly_fields = ('product_id',)

    # --- 3. The Detail/Edit View (Organized into Cards) ---
    fieldsets = (
        ('Core Identification', {
            'fields': ('product_id', 'part_number', 'product_name', 'brand', 'category', 'barcode')
        }),
        ('Sourcing & Import Details', {
            'fields': ('source', 'hs_code')
        }),
        ('Pricing & Costs', {
            'fields': (
                'mrp_inr', 'mrp_bdt', 'purchase_cost_bdt', 
                'markup_percentage', 'wholesale_price_bdt', 'retail_price_bdt'
            )
        }),
        ('Stock Management', {
            'fields': ('min_stock_level', 'max_stock_level', 'reorder_point')
        }),
        ('Units & Compatibility', {
            'fields': ('unit', 'alternative_units', 'vehicle_compatibility')
        }),
        ('Status & Condition', {
            'fields': ('product_status', 'damage_discount_price', 'damage_remark')
        }),
        ('Taxes & Warranty', {
            'fields': ('vat_code', 'warranty_period')
        }),
        ('Product Media', {
            'fields': ('image_1', 'image_2', 'image_3', 'image_4', 'image_5'),
            'classes': ('collapse',) # Keeps images tucked away until clicked
        }),
    )

    # Custom column to quickly see if stock is critically low based on your reorder point
    def stock_status(self, obj):
        # Note: Since actual current stock tracking will be handled by your inventory app later,
        # this is a placeholder to show how you can inject custom logic into the admin table.
        return f"Min: {obj.min_stock_level} / Trigger: {obj.reorder_point}"
    stock_status.short_description = "Stock Rules"

# Register the model to the admin panel
admin.site.register(Product, ProductAdmin)