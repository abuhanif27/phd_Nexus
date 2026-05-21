"""
Django settings for NexusCare project.

Platform-specific settings for Windows, Linux, and macOS.
"""
import os
import sys
import platform
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- PYTHON 3.14 + DJANGO 5.0 COMPATIBILITY PATCH ---
# Fixes AttributeError: 'super' object has no attribute 'dicts' 
# occurring in django/template/context.py due to changed super() 
# behavior in Python 3.14+
try:
    import django.template.context
    def _patched_copy(self):
        cls = self.__class__
        duplicate = cls.__new__(cls)
        if hasattr(self, '__dict__'):
            duplicate.__dict__.update(self.__dict__)
        if hasattr(self, 'dicts'):
            duplicate.dicts = self.dicts[:]
        return duplicate
    django.template.context.BaseContext.__copy__ = _patched_copy
except (ImportError, AttributeError):
    pass
# --- END PATCH ---

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Detect OS for Windows-specific fixes
CURRENT_OS = platform.system()
IS_WINDOWS = CURRENT_OS == 'Windows'

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET', 'dev-secret-change-in-production')
if not os.getenv('DJANGO_SECRET') and os.getenv('DEBUG', '1') != '1':
    raise ValueError("DJANGO_SECRET must be set in production. Generate with: python -c \"import secrets; print(secrets.token_urlsafe(64))\"")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', '1') == '1'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '127.0.0.1,localhost').split(',')
if DEBUG:
    ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    
    # Local apps
    'apps.users',
    'apps.consent',
    'apps.patients',
    'apps.doctors',
    'apps.service_providers',
    'apps.records',
    'apps.scheduling',
    'apps.notifications',
    'apps.ai',
    'apps.reminders',
    'apps.reviews',
    'apps.chat',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.consent.middleware.AuditMiddleware',
]

ROOT_URLCONF = 'nexuscare.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'nexuscare.wsgi.application'
ASGI_APPLICATION = 'nexuscare.asgi.application'

# Channel Layers (Redis)
import socket

def is_redis_running():
    try:
        with socket.create_connection(('localhost', 6379), timeout=0.1):
            return True
    except OSError:
        return False

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.getenv('REDIS_URL', 'redis://localhost:6379/0')],
        },
    },
}

# Use in-memory channel layer for testing or if Redis is not running locally
if 'pytest' in sys.modules or 'test' in sys.argv:
    CHANNEL_LAYERS['default'] = {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
elif not os.getenv('REDIS_URL') and not is_redis_running():
    CHANNEL_LAYERS['default'] = {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }

# Database
if os.getenv('DATABASE_URL'):
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(default=os.getenv('DATABASE_URL'), conn_max_age=600)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'

# Timezone Settings - Server time set to Bangladesh (Asia/Dhaka)
# USE_TZ=True enables timezone-aware datetimes
# All times stored in DB as UTC, displayed as Bangladesh time in admin
# Frontend can convert to user's local timezone using JavaScript
TIME_ZONE = 'Asia/Dhaka'  # Bangladesh Standard Time (BST = UTC+6)
USE_I18N = True
USE_TZ = True  # Store UTC in DB, convert to TIME_ZONE for display

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
if os.getenv('USE_CLOUD_STORAGE', '0') != '1':
    STORAGES = {
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage" if not DEBUG else "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

# Media files
MEDIA_URL = os.getenv('MEDIA_URL', '/media/')
MEDIA_ROOT = BASE_DIR / os.getenv('MEDIA_ROOT', 'media')

# Cloud file storage (Cloudflare R2 / AWS S3 / Supabase Storage)
# Set USE_CLOUD_STORAGE=1 in production to store patient records in the cloud
if os.getenv('USE_CLOUD_STORAGE', '0') == '1':
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage" if not DEBUG else "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME', 'nexuscare-records')
    AWS_S3_ENDPOINT_URL = os.getenv('AWS_S3_ENDPOINT_URL')  # For R2/Supabase
    AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'auto')
    AWS_DEFAULT_ACL = 'private'
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = True  # Signed URLs for private files
    AWS_QUERYSTRING_EXPIRE = 300  # 5 min signed URL expiry

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model
AUTH_USER_MODEL = 'users.User'

# Authentication backends
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_MIN', '15'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('JWT_REFRESH_DAYS', '30'))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS Settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    os.getenv('FRONTEND_URL', 'http://localhost:3000'),
]

# Allow all custom origins from environment variable
additional_origins = os.getenv('CORS_ALLOWED_ORIGINS', '')
if additional_origins:
    CORS_ALLOWED_ORIGINS.extend([o.strip() for o in additional_origins.split(',') if o.strip()])

CORS_ALLOW_CREDENTIALS = True

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_APP_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', f"NexusCare <{os.getenv('EMAIL_HOST_USER')}>")

# Celery Configuration
USE_CELERY = os.getenv('USE_CELERY', '0') == '1'
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# AI/ML Settings
FAISS_INDEX_PATH = BASE_DIR / os.getenv('FAISS_INDEX_PATH', 'ai_index/faiss.index')
SYMPTOM_MODEL_PATH = BASE_DIR / os.getenv('SYMPTOM_MODEL_PATH', 'ai_models/specialist_clf.joblib')
SPACY_MODEL = os.getenv('SPACY_MODEL', 'en_core_web_sm')

# Hugging Face Settings
HF_TOKEN = os.getenv('HF_TOKEN', None)
HF_REPO_ID = os.getenv('HF_REPO_ID', 'hanifgp2500/nexuscare-medical-ai')
USE_HF_MODELS = os.getenv('USE_HF_MODELS', 'True').lower() == 'true'
USE_HF_INFERENCE_API = os.getenv('USE_HF_INFERENCE_API', 'True').lower() == 'true' # Set to True to run models on HF Cloud
USE_LOCAL_AI_MODELS = os.getenv('USE_LOCAL_AI_MODELS', 'False').lower() == 'true' # STRICT: Disable local models for Low RAM
AI_LOCAL_FALLBACK_MODE = os.getenv('AI_LOCAL_FALLBACK_MODE', 'lightweight').lower() # disabled, lightweight, full
AI_LOCAL_TEXT_MAX_CHARS = int(os.getenv('AI_LOCAL_TEXT_MAX_CHARS', '6000'))
HF_INFERENCE_TIMEOUT_SECONDS = float(os.getenv('HF_INFERENCE_TIMEOUT_SECONDS', '20'))
HF_INFERENCE_MAX_RETRIES = int(os.getenv('HF_INFERENCE_MAX_RETRIES', '1'))
HF_RATE_LIMIT_COOLDOWN_SECONDS = int(os.getenv('HF_RATE_LIMIT_COOLDOWN_SECONDS', '120'))
HF_LLM_MODEL = os.getenv('HF_LLM_MODEL', 'openai/gpt-oss-20b')
HF_EMBEDDING_MODEL = os.getenv('HF_EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
HF_NER_MODEL = os.getenv('HF_NER_MODEL', 'd4data/biomedical-ner-all')
HF_OCR_MODEL = os.getenv('HF_OCR_MODEL', 'microsoft/trocr-base-printed')

# BioBERT / clinical-NER tuning (used by the report summary feature).
# Free-tier HF safe defaults: small chunk count, generous cache TTL.
BIOBERT_MIN_SCORE = float(os.getenv('BIOBERT_MIN_SCORE', '0.5'))         # confidence floor
BIOBERT_MAX_CHUNKS = int(os.getenv('BIOBERT_MAX_CHUNKS', '5'))           # chunks per request
BIOBERT_CHUNK_CHARS = int(os.getenv('BIOBERT_CHUNK_CHARS', '1500'))      # chars per chunk
BIOBERT_CORPUS_MAX_CHARS = int(os.getenv('BIOBERT_CORPUS_MAX_CHARS', '6000'))
BIOBERT_CACHE_TTL_SECONDS = int(os.getenv('BIOBERT_CACHE_TTL_SECONDS', '86400'))

# Windows-specific: Tesseract OCR path
if IS_WINDOWS:
    # Try to auto-detect Tesseract path
    tesseract_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    ]
    
    tesseract_cmd = os.getenv('TESSERACT_CMD')
    if tesseract_cmd and os.path.exists(tesseract_cmd):
        import pytesseract
        pytesseract.pytesseract.pytesseract_cmd = tesseract_cmd
    else:
        for path in tesseract_paths:
            if os.path.exists(path):
                import pytesseract
                pytesseract.pytesseract.pytesseract_cmd = path
                break

# File signing settings
FILE_LINK_EXPIRY_SECONDS = 300  # 5 minutes

# --- Production Security Settings ---
if not DEBUG:
    # HTTPS/SSL
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True') == 'True'
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # HSTS
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # Other security headers
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

    # CSRF trusted origins
    CSRF_TRUSTED_ORIGINS = [o for o in CORS_ALLOWED_ORIGINS if o.startswith('https')]

    # Logging
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {module} {message}',
                'style': '{',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'verbose',
            },
        },
        'root': {
            'handlers': ['console'],
            'level': 'WARNING',
        },
        'loggers': {
            'django': {
                'handlers': ['console'],
                'level': 'WARNING',
                'propagate': False,
            },
        },
    }
