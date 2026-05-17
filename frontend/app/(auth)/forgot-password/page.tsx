import Link from 'next/link';
import { ForgotPasswordFlow } from '@/features/auth/components/ForgotPasswordFlow';
import { Heart, Sparkles } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
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
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
              Reset Password
            </h2>
            <p className="mt-2 flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>We'll help you get back into your account</span>
            </p>
          </div>
        </div>

        {/* Forgot Password Flow Card */}
        <ForgotPasswordFlow />

        {/* Additional Links */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p>&copy; 2026 PhD NexusCare AI Medical Platform</p>
        </div>
      </div>
    </div>
  );
}
