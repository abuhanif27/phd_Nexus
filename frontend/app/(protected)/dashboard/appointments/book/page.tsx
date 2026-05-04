import { redirect } from 'next/navigation';

export default function DashboardAppointmentsBookPage() {
  redirect('/appointments?book=1');
}
