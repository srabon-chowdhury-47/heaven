from django.db import models
from brand.models import Brand
import uuid

class Product(models.Model):
    # --- 1. Core Identification ---
    product_id = models.CharField(max_length=20, unique=True, editable=False, null=True, blank=True, help_text="Auto-generated system ID")
    part_number = models.CharField(max_length=100, unique=True, help_text="Manufacturer's part number (Primary Identifier)")  # REQUIRED
    product_name = models.CharField(max_length=255, null=True, blank=True, help_text="Full descriptive name")
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products', help_text="Select the Brand (e.g., Yamaha, Suzuki)")
    category = models.CharField(max_length=100, null=True, blank=True, help_text="Category > Sub-Category hierarchy")
    weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Weight in kg or g")

    # --- 2. Sourcing & Import Details ---
    SOURCE_CHOICES = [
        ('Import', 'Import (India)'),
        ('Local', 'Local Purchase')
    ]
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='Local', null=True, blank=True, help_text="Determines pricing rules")
    hs_code = models.CharField(max_length=50, blank=True, null=True, help_text="Customs HS code for import")
    
    # --- 3. Pricing & Costs ---
    mrp_inr = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, null=True, blank=True, help_text="Maximum Retail Price in Indian Rupee")
    mrp_bdt = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, help_text="MRP converted to BDT")
    purchase_cost_bdt = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Landed cost or local purchase cost")  # REQUIRED
    markup_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, null=True, blank=True, help_text="Markup % on INR (for imports)")
    wholesale_price_bdt = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, null=True, blank=True, help_text="Selling price for wholesale dealers")
    retail_price_bdt = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, null=True, blank=True, help_text="Selling price for retail customers")

    # --- 4. Units & Barcode ---
    unit = models.CharField(max_length=50, default='piece', null=True, blank=True, help_text="Primary unit (piece, set, box)")
    alternative_units = models.CharField(max_length=100, blank=True, null=True, help_text="e.g., 1 box = 12 pieces")
    barcode = models.CharField(max_length=100, unique=True, null=True, blank=True, help_text="EAN-13 or custom barcode")

    # --- 5. Taxes, Warranty & Compatibility ---
    warranty_period = models.IntegerField(default=0, null=True, blank=True, help_text="Warranty period in months")
    vat_code = models.CharField(max_length=50, null=True, blank=True, help_text="Applicable VAT rate code")
    vehicle_compatibility = models.TextField(blank=True, null=True, help_text="Make, Model, Year Range (e.g., Honda CB 125, 2018-2024)")

    # --- 6. Stock Management ---
    min_stock_level = models.IntegerField(default=5, null=True, blank=True, help_text="Reorder alert threshold per warehouse")
    max_stock_level = models.IntegerField(blank=True, null=True, help_text="Overstock warning level")
    reorder_point = models.IntegerField(default=5, null=True, blank=True, help_text="Trigger for purchase requisition")

    # --- 7. Status & Condition ---
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Discontinued', 'Discontinued'),
        ('Seasonal', 'Seasonal'),
        ('Damaged', 'Damaged (slow-moving)')
    ]
    product_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active', null=True, blank=True)
    damage_discount_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, help_text="Special discounted price if damaged")
    damage_remark = models.TextField(blank=True, null=True, help_text="Reason for discount")

    # --- 8. Media (Up to 5 Images) ---
    image_1 = models.ImageField(upload_to='product_pics/', blank=True, null=True)
    image_2 = models.ImageField(upload_to='product_pics/', blank=True, null=True)
    image_3 = models.ImageField(upload_to='product_pics/', blank=True, null=True)
    image_4 = models.ImageField(upload_to='product_pics/', blank=True, null=True)
    image_5 = models.ImageField(upload_to='product_pics/', blank=True, null=True)

    def save(self, *args, **kwargs):
        # 1. Auto-generate Product ID
        if not self.product_id:
            self.product_id = f"PRD-{uuid.uuid4().hex[:6].upper()}"

        # 2. Auto-calculate BDT Selling Price for Imports (as per your logic: INR * BDT Rate * Markup)
        # Assuming an example static conversion rate here (e.g., 1 INR = 1.35 BDT). 
        # In a full ERP, this rate would be fetched from a master settings table.
        if self.source == 'Import' and self.mrp_inr and self.mrp_inr > 0:
            conversion_rate = 1.35 
            base_cost = float(self.mrp_inr) * conversion_rate
            markup_multiplier = 1 + (float(self.markup_percentage) / 100) if self.markup_percentage else 1
            
            # This is a basic auto-fill, it will not overwrite if you manually typed a specific BDT retail price
            if not self.retail_price_bdt or self.retail_price_bdt == 0:
                self.retail_price_bdt = base_cost * markup_multiplier

        super(Product, self).save(*args, **kwargs)

    def __str__(self):
        return f"{self.part_number} - {self.product_name}"