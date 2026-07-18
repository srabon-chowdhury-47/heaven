from pathlib import Path
import os
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-8&cwt-1w@lxx6^i@&r3q^nw@q9pw5u#4g#p-32!h=xqe_)=*^l'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = [
    "heavenautos.com.bd",
    "www.heavenautos.com.bd",
    "103.125.252.186",   # optional server IP
    "127.0.0.1",         # Required for Nginx proxy routing
    "localhost"
]

# --- IMPORTANT FIX FOR NGINX / CSRF BLOCKS ---
CSRF_TRUSTED_ORIGINS = [
    'http://heavenautos.com.bd',
    'https://heavenautos.com.bd',
    'http://www.heavenautos.com.bd',
    'https://www.heavenautos.com.bd',
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt', # Required for your React Login
    'corsheaders',              # Allows React to talk to Django
    'drf_spectacular',
    'rest_framework_simplejwt.token_blacklist',
    
    # Custom apps
    'person',
    'products',
    'purchase',
    'sale',
    'draftSale',
    'stock',
    'brand',
    'supplier',
    'payment',
    'capital',
    'expense',
    'account.apps.AccountConfig',
    'user',
    'customerLedger',
    'draftPurchase',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # MUST be at the top
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
WSGI_APPLICATION = 'core.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# --- CLEANED UP STATIC & MEDIA FILES ---
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# --- COMBINED CORS ORIGINS ---
CORS_ALLOWED_ORIGINS = [
    "https://heavenautos.com.bd",
    "https://www.heavenautos.com.bd",
    "http://localhost:5173",  # Keep local for testing
    "http://127.0.0.1:5173",
]

# --- DJANGO REST FRAMEWORK CONFIGURATION ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
AUTH_USER_MODEL = 'user.User'  # Custom User model
# --- DRF SPECTACULAR (SWAGGER) SETTINGS ---
DRF_SPECTACULAR_SETTINGS = {
    'TITLE': 'Heaven Autos API',
    'DESCRIPTION': 'Interactive API documentation for Heaven Autos application (OAS 3.0/3.1)',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# Token Lifetimes (Optional but highly recommended)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}