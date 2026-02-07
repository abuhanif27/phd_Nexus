import { RegisterForm } from '@/features/auth/components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Join NexusCare for AI-powered healthcare analysis
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
