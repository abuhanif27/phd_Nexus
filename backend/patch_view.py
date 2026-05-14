import re
with open("apps/records/views.py", "r") as f:
    content = f.read()

action_import = "from rest_framework.decorators import action\n"
if "from rest_framework.decorators import action" not in content:
    content = content.replace("from rest_framework import views, viewsets, status, generics", "from rest_framework.decorators import action\nfrom rest_framework import views, viewsets, status, generics")

action_code = """    @action(detail=False, methods=['post'], url_path='parse-image', parser_classes=[MultiPartParser, FormParser])
    def parse_image(self, request):
        \"\"\"Parse prescription image using AI service.\"\"\"
        user = request.user
        
        # Determine patient context
        if user.role == 'patient':
            patient = user.patient_profile
        else:
            return Response({"error": "Only patients can parse their records currently"}, status=status.HTTP_403_FORBIDDEN)
            
        file_id = request.data.get('fileId')
        file_obj = request.FILES.get('file')
        
        db_file = None
        if file_id:
            try:
                db_file = File.objects.get(id=file_id, patient=patient)
                # use db_file.storage_path
            except File.DoesNotExist:
                return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
                
        try:
            from apps.ai.services import PrescriptionParser
            results = PrescriptionParser.parse_image(db_file=db_file, raw_file=file_obj, patient=patient)
            return Response(results, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
"""

if "def parse_image" not in content:
    content = content.replace("class PrescriptionViewSet(viewsets.ModelViewSet):", "class PrescriptionViewSet(viewsets.ModelViewSet):\n" + action_code)

with open("apps/records/views.py", "w") as f:
    f.write(content)

print("Patch applied to views.py!")
