import re

with open('backend/apps/records/views.py', 'r') as f:
    content = f.read()

endpoint_code = """

    @action(detail=False, methods=['post'], url_path='parse-image', parser_classes=[MultiPartParser, FormParser])
    def parse_image(self, request):
        \"\"\"
        Extract text from prescription and return medicines.
        Accepts either 'file' (upload) or 'file_id' (existing record).
        \"\"\"
        from apps.ai.services import PrescriptionParser
        from apps.records.models import File
        import os
        from django.conf import settings
        
        patient = getattr(request.user, 'patient_profile', None)
        if not patient and request.user.role == 'doctor':
            patient_id = request.data.get('patient')
            from apps.patients.models import Patient
            patient = Patient.objects.filter(id=patient_id).first()
            
        if not patient:
            return Response({'error': 'Patient context required'}, status=status.HTTP_400_BAD_REQUEST)

        file_obj = request.FILES.get('file')
        file_id = request.data.get('file_id')
        
        if file_id:
            record = File.objects.filter(id=file_id, patient=patient).first()
            if not record:
                return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Need to pass an open file-like object to parser
            # In Django, storage_path should be absolute or relative to media root
            path = record.storage_path
            if not os.path.exists(path) and hasattr(settings, 'MEDIA_ROOT'):
                 path = os.path.join(settings.MEDIA_ROOT, path.lstrip('/'))
                 
            if os.path.exists(path):
                 file_obj = open(path, 'rb')
            else:
                 return Response({'error': 'File missing from storage'}, status=status.HTTP_404_NOT_FOUND)
                 
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        parsed_data = PrescriptionParser.parse_image(file_obj, patient)
        
        if file_id and hasattr(file_obj, 'close'):
            file_obj.close()
            
        return Response(parsed_data)
"""

if 'def parse_image' not in content:
    # Insert inside PrescriptionViewSet
    p = re.compile(r'(class PrescriptionViewSet\[^\]]*:.*?)(?=\nclass |\Z)', re.DOTALL)
    
    def repl(m):
        return m.group(1) + endpoint_code
        
    new_content = re.sub(r'(class PrescriptionViewSet.*?)(?=\nclass |\Z)', repl, content, flags=re.DOTALL)
    with open('backend/apps/records/views.py', 'w') as f:
        f.write(new_content)
    print("Patched!")
else:
    print("Already exists")
