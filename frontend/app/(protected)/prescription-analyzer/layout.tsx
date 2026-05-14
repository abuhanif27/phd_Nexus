import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prescription Analyzer | PhD NexusCare',
  description: 'AI powered prescription extraction tool',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
