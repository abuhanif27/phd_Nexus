import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.records.models import File

latest_file = File.objects.order_by('-created_at').first()

if latest_file:
    print(f"File: {latest_file.filename}")
    print(f"Extracted text length: {len(latest_file.extracted_text)}")
    text_preview = latest_file.extracted_text[:300] if latest_file.extracted_text else 'EMPTY'
    print(f"Text preview: {text_preview}")
else:
    print("No files found")