import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { Heart, Sparkles } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo & Header */}
        <div className="space-y-4 text-center">
          <Link href="/" className="inline-flex items-center justify-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
              <Heart className="h-7 w-7 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-2xl font-bold text-transparent">
              NexusCare
            </span>
          </Link>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Welcome back</h2>
            <p className="mt-2 flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>AI-powered healthcare at your fingertips</span>
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <LoginForm />

        {/* Additional Links */}
        <div className="space-y-3 text-center">
          <div className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="font-semibold text-blue-600 transition-colors hover:text-blue-500"
            >
              Sign up for free
            </Link>
          </div>

          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <Link href="/" className="transition-colors hover:text-blue-600">
              About
            </Link>
            <span>•</span>
            <Link href="/" className="transition-colors hover:text-blue-600">
              Privacy
            </Link>
            <span>•</span>
            <Link href="/" className="transition-colors hover:text-blue-600">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
