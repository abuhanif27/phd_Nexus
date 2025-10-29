"""
Management command to seed demo data for testing.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.patients.models import Patient
from apps.doctors.models import Doctor
from apps.records.models import LabResult, Prescription
from apps.scheduling.models import Appointment
from datetime import datetime, timedelta
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with demo data for testing'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')
        
        # Create demo doctors
        doctors_data = [
            {
                'email': 'dr.cardio@example.com',
                'name': 'Dr. Sarah Johnson',
                'specialty': 'Cardiology'
            },
            {
                'email': 'dr.dermato@example.com',
                'name': 'Dr. Michael Chen',
                'specialty': 'Dermatology'
            },
            {
                'email': 'dr.neuro@example.com',
                'name': 'Dr. Emily Rodriguez',
                'specialty': 'Neurology'
            },
            {
                'email': 'dr.ortho@example.com',
                'name': 'Dr. David Williams',
                'specialty': 'Orthopedics'
            },
            {
                'email': 'dr.general@example.com',
                'name': 'Dr. Lisa Anderson',
                'specialty': 'General Medicine'
            },
        ]
        
        created_doctors = []
        for doc_data in doctors_data:
            user, created = User.objects.get_or_create(
                email=doc_data['email'],
                defaults={
                    'role': 'doctor',
                    'is_active': True,
                }
            )
            if created:
                user.set_password('TestPass123!')
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Created doctor user: {doc_data["email"]}'))
            
            doctor, created = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    'name': doc_data['name'],
                    'specialty': doc_data['specialty']
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created doctor profile: {doc_data["name"]} ({doc_data["specialty"]})'))
            created_doctors.append(doctor)
        
        # Ensure patient demo account exists
        patient_user, created = User.objects.get_or_create(
            email='patient@example.com',
            defaults={
                'role': 'patient',
                'is_active': True,
            }
        )
        if created:
            patient_user.set_password('TestPass123!')
            patient_user.save()
            self.stdout.write(self.style.SUCCESS('Created patient user: patient@example.com'))
        
        patient, created = Patient.objects.get_or_create(
            user=patient_user,
            defaults={
                'date_of_birth': '1985-06-15',
                'gender': 'M',
                'blood_type': 'O+'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created patient profile: John Doe'))
        
        # Create demo lab results
        lab_results = [
            {
                'title': 'Complete Blood Count (CBC)',
                'summary': 'All values within normal range. WBC: 7.2 K/uL, RBC: 4.8 M/uL, Hemoglobin: 14.5 g/dL, Platelets: 250 K/uL',
                'data': {
                    'WBC': '7.2 K/uL',
                    'RBC': '4.8 M/uL',
                    'Hemoglobin': '14.5 g/dL',
                    'Hematocrit': '42%',
                    'Platelets': '250 K/uL'
                }
            },
            {
                'title': 'Lipid Panel',
                'summary': 'Total cholesterol slightly elevated. Total: 210 mg/dL, LDL: 140 mg/dL, HDL: 45 mg/dL, Triglycerides: 150 mg/dL',
                'data': {
                    'Total Cholesterol': '210 mg/dL',
                    'LDL': '140 mg/dL',
                    'HDL': '45 mg/dL',
                    'Triglycerides': '150 mg/dL'
                }
            },
            {
                'title': 'Comprehensive Metabolic Panel',
                'summary': 'Glucose and kidney function normal. Glucose: 95 mg/dL, Creatinine: 0.9 mg/dL, BUN: 18 mg/dL',
                'data': {
                    'Glucose': '95 mg/dL',
                    'Sodium': '140 mEq/L',
                    'Potassium': '4.2 mEq/L',
                    'Creatinine': '0.9 mg/dL',
                    'BUN': '18 mg/dL'
                }
            }
        ]
        
        for lab_data in lab_results:
            lab, created = LabResult.objects.get_or_create(
                patient=patient,
                title=lab_data['title'],
                defaults={
                    'summary': lab_data['summary'],
                    'data': lab_data['data'],
                    'ts': timezone.now() - timedelta(days=30)
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created lab result: {lab_data["title"]}'))
        
        # Create demo prescriptions
        prescriptions = [
            {
                'doctor': created_doctors[0],  # Cardiologist
                'items': [
                    {'drug': 'Lisinopril', 'dosage': '10mg', 'frequency': 'Once daily'},
                    {'drug': 'Atorvastatin', 'dosage': '20mg', 'frequency': 'Once daily at bedtime'}
                ],
                'notes': 'For blood pressure and cholesterol management. Take with food. Monitor blood pressure weekly.'
            },
            {
                'doctor': created_doctors[4],  # General Medicine
                'items': [
                    {'drug': 'Vitamin D3', 'dosage': '2000 IU', 'frequency': 'Once daily'},
                    {'drug': 'Multivitamin', 'dosage': '1 tablet', 'frequency': 'Once daily with breakfast'}
                ],
                'notes': 'Vitamin D levels were low. Continue for 3 months then recheck.'
            }
        ]
        
        for rx_data in prescriptions:
            rx, created = Prescription.objects.get_or_create(
                patient=patient,
                doctor=rx_data['doctor'],
                notes=rx_data['notes'],
                defaults={
                    'items': rx_data['items'],
                    'ts': timezone.now() - timedelta(days=15)
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created prescription from {rx_data["doctor"].name}'))
        
        # Create demo appointments
        appointments = [
            {
                'doctor': created_doctors[0],
                'scheduled_at': timezone.now() + timedelta(days=7),
                'reason': 'Follow-up for blood pressure management',
                'status': 'scheduled'
            },
            {
                'doctor': created_doctors[2],
                'scheduled_at': timezone.now() + timedelta(days=14),
                'reason': 'Consultation for recurring headaches',
                'status': 'scheduled'
            },
            {
                'doctor': created_doctors[4],
                'scheduled_at': timezone.now() - timedelta(days=30),
                'reason': 'Annual physical examination',
                'status': 'completed'
            }
        ]
        
        for apt_data in appointments:
            apt, created = Appointment.objects.get_or_create(
                patient=patient,
                doctor=apt_data['doctor'],
                scheduled_at=apt_data['scheduled_at'],
                defaults={
                    'reason': apt_data['reason'],
                    'status': apt_data['status']
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created appointment with {apt_data["doctor"].name}'))
        
        self.stdout.write(self.style.SUCCESS('\n✅ Demo data seeding complete!'))
        self.stdout.write(self.style.SUCCESS('\n📋 Summary:'))
        self.stdout.write(f'  - Doctors: {len(created_doctors)}')
        self.stdout.write(f'  - Lab Results: {len(lab_results)}')
        self.stdout.write(f'  - Prescriptions: {len(prescriptions)}')
        self.stdout.write(f'  - Appointments: {len(appointments)}')
        self.stdout.write(self.style.SUCCESS('\n🔑 Login Credentials:'))
        self.stdout.write('  Patient: patient@example.com / TestPass123!')
        self.stdout.write('  Doctors: dr.cardio@example.com (and others) / TestPass123!')
