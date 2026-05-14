import re
with open('backend/apps/ai/services.py', 'r') as f:
    content = f.read()

target = """                file_obj.seek(0)
                files = {'file': ('prescription.jpg', file_obj, 'application/octet-stream')}
                response = requests.post(f"{ngrok_url}/extract_prescription", files=files, timeout=60)"""

replacement = """                file_name = getattr(file_obj, 'name', 'prescription.jpg').lower()
                upload_file_obj = file_obj
                filename_to_send = 'prescription.jpg'

                if file_name.endswith('.pdf'):
                    try:
                        import pypdfium2 as pdfium
                        import io
                        file_obj.seek(0)
                        pdf = pdfium.PdfDocument(file_obj)
                        page = pdf.get_page(0)  # Get first page
                        pil_image = page.render(scale=2).to_pil()
                        img_byte_arr = io.BytesIO()
                        pil_image.save(img_byte_arr, format='JPEG')
                        img_byte_arr.seek(0)
                        upload_file_obj = img_byte_arr
                    except Exception as e:
                        print("PDF conversion failed:", str(e))
                else:
                    file_obj.seek(0)

                files = {'file': (filename_to_send, upload_file_obj, 'application/octet-stream')}
                response = requests.post(f"{ngrok_url}/extract_prescription", files=files, timeout=60)"""

if target in content:
    with open('backend/apps/ai/services.py', 'w') as f:
        f.write(content.replace(target, replacement))
    print("Backend PDF support added properly.")
else:
    print("Target not found. Something mismatch.")
