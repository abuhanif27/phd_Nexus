"""
Management command to build FAISS index for a patient.
"""
from django.core.management.base import BaseCommand
from apps.ai.services import ai_service


class Command(BaseCommand):
    help = 'Build FAISS index for patient medical records'
    
    def add_arguments(self, parser):
        parser.add_argument('--patient', type=int, required=True, help='Patient ID')
    
    def handle(self, *args, **options):
        patient_id = options['patient']
        
        self.stdout.write(f'Building index for patient {patient_id}...')
        
        try:
            ai_service.build_patient_index(patient_id)
            self.stdout.write(self.style.SUCCESS('Index built successfully!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
