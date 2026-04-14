import { RegisterForm } from '@/features/auth/components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Create your account</h1>
          <p className="mt-3 text-base text-gray-600">
            Join NexusCare for AI-powered healthcare analysis
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
