import pandas as pd
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Product
from .serializers import ProductSerializer
from brand.models import Brand  # <-- Added the Brand model import

# --- 1. Standard CRUD ViewSet ---
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

# --- 2. New Bulk Excel Import View ---
class BulkProductImportView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file = request.FILES.get('excel_file') or request.FILES.get('file') 
        
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.read_excel(file)
            
            # Convert all NaN values to None safely
            df = df.replace({getattr(pd, 'NA', None): None})
            df = df.where(pd.notnull(df), None)

            created_count = 0
            for index, row in df.iterrows():
                part_number = row.get('part_number')
                if not part_number:
                    continue  # Skip rows without primary identity validation

                # Safely pull barcode check
                barcode = row.get('barcode')
                
                # Check for duplicates before executing transaction
                if Product.objects.filter(part_number=part_number).exists() or \
                   (barcode and Product.objects.filter(barcode=barcode).exists()):
                    continue
                
                # --- AUTOMATIC BRAND CREATION LOGIC ---
                brand_raw = row.get('brand')
                brand_obj = None
                
                if brand_raw and str(brand_raw).strip().lower() not in ['nan', 'none', '']:
                    brand_obj, created = Brand.objects.get_or_create(name=str(brand_raw).strip())

                # --- SECURE DATA TYPE DICTIONARY ---
                def safe_int(val, default=0):
                    if val is None or str(val).strip().lower() in ['nan', 'none', '']:
                        return default
                    try:
                        return int(float(val))
                    except (ValueError, TypeError):
                        return default

                def safe_decimal(val, default=0.00):
                    if val is None or str(val).strip().lower() in ['nan', 'none', '']:
                        return default
                    try:
                        return float(val)
                    except (ValueError, TypeError):
                        return default

                # Map fields defensively using key fallbacks
                product = Product(
                    part_number=str(part_number).strip(),
                    product_name=row.get('product_name', f"Product {part_number}"),
                    brand=brand_obj,
                    category=row.get('category', ''),
                    source=row.get('source', 'Local'),
                    hs_code=row.get('hs_code', ''),
                    mrp_inr=safe_decimal(row.get('mrp_inr'), 0.00),
                    purchase_cost_bdt=safe_decimal(row.get('purchase_cost_bdt'), 0.00),
                    markup_percentage=safe_decimal(row.get('markup_percentage'), 0.00),
                    wholesale_price_bdt=safe_decimal(row.get('wholesale_price_bdt'), 0.00),
                    retail_price_bdt=safe_decimal(row.get('retail_price_bdt'), 0.00),
                    unit=row.get('unit', 'piece'),
                    alternative_units=row.get('alternative_units', ''),
                    barcode=barcode if barcode else None,
                    warranty_period=safe_int(row.get('warranty_period'), 0),
                    vat_code=row.get('vat_code', ''),
                    vehicle_compatibility=row.get('vehicle_compatibility', ''),
                    min_stock_level=safe_int(row.get('min_stock_level'), 5),
                    max_stock_level=safe_int(row.get('max_stock_level'), None) if row.get('max_stock_level') is not None else None,
                    reorder_point=safe_int(row.get('reorder_point'), 5),
                    product_status=row.get('product_status', 'Active'),
                    weight=safe_decimal(row.get('weight'), None) if row.get('weight') is not None else None,
                )
                
                product.save() 
                created_count += 1
            
            return Response(
                {"message": f"Successfully imported {created_count} products."}, 
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            # This captures structural system issues explicitly
            return Response(
                {"error": f"Failed to parse Excel: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )