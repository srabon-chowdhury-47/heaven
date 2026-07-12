from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

# --- REST FRAMEWORK IMPORTS ---
from rest_framework.decorators import api_view
from rest_framework.response import Response

# --- DRF SPECTACULAR IMPORTS ---
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

# --- CREATE THE MASTER API ROOT VIEW ---
@api_view(['GET'])
def master_api_root(request):
    """
    Master API directory for Heaven Autos.
    This generates a clickable list of all your app routers.
    """
    return Response({
        "1. Person / HR API": request.build_absolute_uri('/api/person/'),
        "2. Products API": request.build_absolute_uri('/api/products/'),
        "3. Purchase API": request.build_absolute_uri('/api/purchase/'),
        "4. Sale API": request.build_absolute_uri('/api/sale/'),
        "5. Draft Sale API": request.build_absolute_uri('/api/draft-sale/'),
        "6. Stock / Inventory API": request.build_absolute_uri('/api/stock/'),
        "7. Brand API": request.build_absolute_uri('/api/brand/'),
        "8. Supplier API": request.build_absolute_uri('/api/supplier/'),
        "9. Payment API": request.build_absolute_uri('/api/payment/'),
        "10. Capital API": request.build_absolute_uri('/api/capital/'),
        "11. Expense API": request.build_absolute_uri('/api/expense/'),
        "12. Account API": request.build_absolute_uri('/api/account/'),
        "13. User API": request.build_absolute_uri('/api/users/'),
        "14. Customer Ledger API": request.build_absolute_uri('/api/customerledger/'),
        "Interactive Swagger Docs": request.build_absolute_uri('/api/docs/'),  # Added directory link
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # --- ROOT PATHS ---
    path('', master_api_root, name='master-api-root'),
    path('api/', master_api_root, name='api-root'),
    
    # --- SWAGGER INTERACTIVE API DOCUMENTATION ---
    # Generates the OpenAPI schema JSON file behind the scenes
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    # Serves the user interface matching your reference picture
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # --- MODULAR APP ROUTES ---
    path('api/person/', include('person.urls')),
    path('api/products/', include('products.urls')),
    path('api/purchase/', include('purchase.urls')),
    path('api/sale/', include('sale.urls')),
    path('api/stock/', include('stock.urls')),
    path('api/brand/', include('brand.urls')),
    path('api/supplier/', include('supplier.urls')),
    path('api/payment/', include('payment.urls')), 
    path('api/capital/', include('capital.urls')),
    path('api/expense/', include('expense.urls')),
    path('api/account/', include('account.urls')),
    path('api/draft-sale/', include('draftSale.urls')),
    path('api/users/', include('user.urls')),
    path('api/customerledger/', include('customerLedger.urls')),

    # --- TOKEN AUTHENTICATION ---
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Media Files
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)