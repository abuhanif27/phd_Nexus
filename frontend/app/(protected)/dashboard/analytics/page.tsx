import { redirect } from 'next/navigation';

export default function DashboardAnalyticsPage() {
  redirect('/health-summary');
}
