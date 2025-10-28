"""
Management command to seed demo data.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, time
from apps.users.models import User
from apps.patients.models import Patient
from apps.doctors.models import Doctor
from apps.scheduling.models import DoctorAvailability
from apps.records.models import LabResult, Prescription


class Command(BaseCommand):
    help = 'Seed database with demo data'
    
    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')
        
        # Create patient user
        patient_user, created = User.objects.get_or_create(
            email='patient@example.com',
            defaults={
                'role': 'patient',
                'phone': '+1234567890'
            }
        )
        if created:
            patient_user.set_password('Pass1234!')
            patient_user.save()
            self.stdout.write(self.style.SUCCESS('Created patient user'))
        
        # Create patient profile
        patient, _ = Patient.objects.get_or_create(
            user=patient_user,
            defaults={
                'name': 'John Doe',
                'dob': '1990-01-15',
                'gender': 'M',
                'blood_group': 'O+',
                'emergency_contact': {
                    'name': 'Jane Doe',
                    'phone': '+1234567891',
                    'relation': 'Spouse'
                }
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Patient profile: {patient.name}'))
        
        # Create doctor user
        doctor_user, created = User.objects.get_or_create(
            email='doctor@example.com',
            defaults={
                'role': 'doctor',
                'phone': '+1234567892'
            }
        )
        if created:
            doctor_user.set_password('Pass1234!')
            doctor_user.save()
            self.stdout.write(self.style.SUCCESS('Created doctor user'))
        
        # Create doctor profile
        doctor, _ = Doctor.objects.get_or_create(
            user=doctor_user,
            defaults={
                'name': 'Dr. Sarah Smith',
                'specialty': 'Cardiology',
                'qualifications': 'MD, Board Certified Cardiologist',
                'bio': 'Experienced cardiologist with 10+ years of practice.',
                'location': 'New York, NY',
                'rating': 4.8
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Doctor profile: {doctor.name}'))
        
        # Create doctor availability (Mon-Fri, 9 AM - 5 PM)
        for day in range(5):  # Monday to Friday
            DoctorAvailability.objects.get_or_create(
                doctor=doctor,
                day_of_week=day,
                start_time=time(9, 0),
                defaults={
                    'end_time': time(17, 0),
                    'breaks': [{'start': '12:00', 'end': '13:00'}]
                }
            )
        self.stdout.write(self.style.SUCCESS('Created doctor availability'))
        
        # Create some lab results
        LabResult.objects.get_or_create(
            patient=patient,
            title='Complete Blood Count',
            defaults={
                'summary': 'All values within normal range',
                'data': {
                    'hemoglobin': 14.5,
                    'wbc': 7200,
                    'platelets': 250000
                }
            }
        )
        
        LabResult.objects.get_or_create(
            patient=patient,
            title='Lipid Panel',
            defaults={
                'summary': 'Cholesterol slightly elevated',
                'data': {
                    'total_cholesterol': 220,
                    'ldl': 140,
                    'hdl': 55,
                    'triglycerides': 125
                }
            }
        )
        
        self.stdout.write(self.style.SUCCESS('Created lab results'))
        
        # Create prescription
        Prescription.objects.get_or_create(
            patient=patient,
            doctor=doctor,
            defaults={
                'items': [
                    {
                        'drug': 'Lisinopril',
                        'dosage': '10mg',
                        'duration': '30 days',
                        'instructions': 'Take once daily in the morning'
                    }
                ],
                'notes': 'For blood pressure management'
            }
        )
        
        self.stdout.write(self.style.SUCCESS('Created prescription'))
        
        self.stdout.write(self.style.SUCCESS('\nDemo data seeded successfully!'))
        self.stdout.write('Login credentials:')
        self.stdout.write('  Patient: patient@example.com / Pass1234!')
        self.stdout.write('  Doctor: doctor@example.com / Pass1234!')
