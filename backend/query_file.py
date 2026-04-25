from apps.records.models import File
latest_file = File.objects.order_by('-created_at').first()
if latest_file:
    print(f"File: {latest_file.filename}")
    print(f"Extracted text length: {len(latest_file.extracted_text)}")
    print(f"Text preview: {latest_file.extracted_text[:300] if latest_file.extracted_text else 'EMPTY'}")
else:
    print("No files found")
