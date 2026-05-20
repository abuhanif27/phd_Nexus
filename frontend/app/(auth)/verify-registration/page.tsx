'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useVerifyRegistration } from '@/features/auth/hooks';
import { VerifyRegistrationInput, verifyRegistrationSchema } from '@/features/auth/schemas';
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { OTPInput } from '@/features/auth/components/OTPInput';

function VerifyRegistrationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';
  
  const { mutate: verify, isPending, error, isSuccess } = useVerifyRegistration();

  const onSubmit = React.useCallback((data: VerifyRegistrationInput) => {
    verify(data);
  }, [verify]);

  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyRegistrationInput>({
    resolver: zodResolver(verifyRegistrationSchema),
    defaultValues: {
      email: email,
      code: '',
    },
  });

  const otpValue = watch('code');

  // Real-time check: when otp hits 6 digits, auto-submit
  React.useEffect(() => {
    if (otpValue.length === 6 && !isPending && !isSuccess) {
      handleSubmit(onSubmit)();
    }
  }, [otpValue, isPending, isSuccess, handleSubmit, onSubmit]);

  const status = isSuccess ? 'success' : error ? 'error' : 'idle';

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 transition-all duration-500">
            {isSuccess ? (
              <CheckCircle2 className="h-10 w-10 text-green-600 animate-bounce" />
            ) : (
              <ShieldCheck className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {isSuccess ? 'Verified!' : 'Verify your email'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isSuccess 
              ? 'Taking you to your dashboard...' 
              : "We've sent a 6-digit verification code to"}
          </p>
          {!isSuccess && <p className="font-semibold text-gray-900 dark:text-gray-100">{email || 'your email'}</p>}
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900 transition-all duration-500">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="flex items-start space-x-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/70 dark:bg-red-950/50">
                <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error instanceof Error ? error.message : 'Verification failed. Please check the code.'}
                </p>
              </div>
            )}

            <div>
              <label
                className={`mb-4 block text-center text-sm font-medium transition-colors ${
                  error ? 'text-red-600' : isSuccess ? 'text-green-600' : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {error ? 'Invalid Code' : isSuccess ? 'Code Matched' : 'Enter 6-Digit Code'}
              </label>
              
              <OTPInput 
                value={otpValue}
                onChange={(val) => setValue('code', val)}
                status={status}
                disabled={isPending || isSuccess}
              />
              
              {errors.code && (
                <p className="mt-4 text-center text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending || isSuccess || otpValue.length < 6}
              className={`flex w-full items-center justify-center space-x-2 rounded-xl px-4 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 ${
                isSuccess 
                  ? 'bg-green-600 ring-green-500 scale-95' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 focus:ring-blue-500 hover:shadow-blue-500/25'
              } disabled:opacity-50 disabled:grayscale`}
            >
              {isPending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : isSuccess ? (
                <span>Success!</span>
              ) : (
                <>
                  <span>Verify Account</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {!isSuccess && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors underline underline-offset-4"
                  onClick={() => router.refresh()}
                >
                  Resend
                </button>
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <span>Back to Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyRegistrationPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <VerifyRegistrationForm />
    </React.Suspense>
  );
}
