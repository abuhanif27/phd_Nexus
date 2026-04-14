import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-white px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 sm:px-6">
      <ThemeToggle className="absolute right-4 top-4 bg-white/70 backdrop-blur hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-700 sm:right-6 sm:top-6" />
      <div className="w-full max-w-md sm:max-w-lg">{children}</div>
    </div>
  );
}
