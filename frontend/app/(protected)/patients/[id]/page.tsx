import { MedicalRecordsPage } from '@/features/records/components/MedicalRecordsPage';

export const metadata = {
  title: 'Patient Records | NexusCare',
  description: 'View patient medical records',
};

export default async function PatientRecordsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  const patientId = parseInt(resolvedParams.id, 10);
  
  return <MedicalRecordsPage patientId={patientId} />;
}
