'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useVerifyRegistration } from '@/features/auth/hooks';
import { VerifyRegistrationInput, verifyRegistrationSchema } from '@/features/auth/schemas';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function VerifyRegistrationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';
  
  const { mutate: verify, isPending, error } = useVerifyRegistration();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyRegistrationInput>({
    resolver: zodResolver(verifyRegistrationSchema),
    defaultValues: {
      email: email,
      code: '',
    },
  });

  const onSubmit = (data: VerifyRegistrationInput) => {
    verify(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <ShieldCheck className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Verify your email
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            We've sent a 6-digit verification code to
          </p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{email || 'your email'}</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="flex items-start space-x-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/70 dark:bg-red-950/50">
                <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error instanceof Error ? error.message : 'Verification failed. Please check the code.'}
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Verification Code
              </label>
              <div className="relative mt-1">
                <input
                  id="code"
                  type="text"
                  maxLength={6}
                  disabled={isPending}
                  {...register('code')}
                  className="block w-full rounded-lg border border-gray-300 bg-white py-4 text-center text-2xl font-bold tracking-[0.5em] text-gray-900 placeholder-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-gray-600"
                  placeholder="000000"
                />
              </div>
              {errors.code && (
                <p className="mt-2 text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isPending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Verify Account</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Didn't receive the code?{' '}
              <button
                type="button"
                className="font-medium text-blue-600 hover:text-blue-500"
                onClick={() => router.refresh()}
              >
                Resend
              </button>
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
