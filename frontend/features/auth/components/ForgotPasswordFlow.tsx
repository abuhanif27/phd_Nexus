'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRequestPasswordReset, useResetPassword } from '../hooks';
import { 
  PasswordResetRequestInput, 
  passwordResetRequestSchema,
  PasswordResetInput,
  passwordResetSchema
} from '../schemas';
import { Mail, Lock, Key, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export function ForgotPasswordFlow() {
  const [step, setStep] = React.useState<'request' | 'verify'>('request');
  const [email, setEmail] = React.useState('');

  const requestMutation = useRequestPasswordReset();
  const resetMutation = useResetPassword();

  const requestForm = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm<PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: '',
      code: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const onRequestSubmit = async (data: PasswordResetRequestInput) => {
    requestMutation.mutate(data, {
      onSuccess: () => {
        setEmail(data.email);
        resetForm.setValue('email', data.email);
        setStep('verify');
      },
    });
  };

  const onResetSubmit = (data: PasswordResetInput) => {
    resetMutation.mutate(data);
  };

  // Dynamic border classes for OTP input
  const getOtpBorderClasses = () => {
    if (resetMutation.isError) return 'border-red-500 focus:border-red-600 focus:ring-red-200 dark:border-red-700 dark:focus:ring-red-900/30';
    if (resetMutation.isSuccess) return 'border-green-500 focus:border-green-600 focus:ring-green-200 dark:border-green-700 dark:focus:ring-green-900/30';
    return 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800';
  };

  if (step === 'request') {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900 transition-all duration-300">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Key className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Forgot Password?</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your email and we'll send you a code to reset your password.
          </p>
        </div>

        <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Email Address
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                {...requestForm.register('email')}
                className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="your.email@example.com"
              />
            </div>
            {requestForm.formState.errors.email && (
              <p className="mt-1 text-xs text-red-600">{requestForm.formState.errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={requestMutation.isPending}
            className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
          >
            {requestMutation.isPending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Send Reset Code</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <Link
            href="/login"
            className="flex items-center justify-center space-x-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Login</span>
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900 transition-all duration-500">
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          {resetMutation.isSuccess ? (
            <CheckCircle2 className="h-6 w-6 text-green-600 animate-bounce" />
          ) : (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          )}
        </div>
        <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
          {resetMutation.isSuccess ? 'Success!' : 'Verify Code'}
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {resetMutation.isSuccess 
            ? 'Password reset successfully. Redirecting...' 
            : `A reset code has been sent to ${email}`}
        </p>
      </div>

      <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
        {resetMutation.isError && (
          <div className="flex items-start space-x-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/70 dark:bg-red-950/50">
            <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
            <p className="text-xs text-red-700 dark:text-red-400">
              {resetMutation.error instanceof Error ? resetMutation.error.message : 'Reset failed. Check code or passwords.'}
            </p>
          </div>
        )}

        {/* OTP Code */}
        <div>
          <label className={`block text-sm font-medium ${resetMutation.isError ? 'text-red-600' : resetMutation.isSuccess ? 'text-green-600' : 'text-gray-700 dark:text-gray-200'}`}>
            {resetMutation.isError ? 'Invalid Code' : resetMutation.isSuccess ? 'Code Verified' : '6-Digit Code'}
          </label>
          <div className="relative mt-1">
            <input
              type="text"
              maxLength={6}
              disabled={resetMutation.isPending || resetMutation.isSuccess}
              {...resetForm.register('code')}
              className={`block w-full rounded-lg bg-white py-3 text-center text-2xl font-bold tracking-[0.5em] text-gray-900 focus:outline-none focus:ring-2 transition-all duration-300 ${getOtpBorderClasses()} dark:text-white`}
              placeholder="000000"
            />
          </div>
          {resetForm.formState.errors.code && (
            <p className="mt-1 text-xs text-red-600">{resetForm.formState.errors.code.message}</p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            New Password
          </label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              disabled={resetMutation.isPending || resetMutation.isSuccess}
              {...resetForm.register('new_password')}
              className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="••••••••"
            />
          </div>
          {resetForm.formState.errors.new_password && (
            <p className="mt-1 text-xs text-red-600">{resetForm.formState.errors.new_password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Confirm Password
          </label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              disabled={resetMutation.isPending || resetMutation.isSuccess}
              {...resetForm.register('confirm_password')}
              className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="••••••••"
            />
          </div>
          {resetForm.formState.errors.confirm_password && (
            <p className="mt-1 text-xs text-red-600">{resetForm.formState.errors.confirm_password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={resetMutation.isPending || resetMutation.isSuccess}
          className={`mt-2 flex w-full items-center justify-center space-x-2 rounded-xl px-4 py-3 font-semibold text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 ${
            resetMutation.isSuccess 
              ? 'bg-green-600 ring-green-500' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 focus:ring-blue-500'
          } disabled:opacity-50`}
        >
          {resetMutation.isPending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : resetMutation.isSuccess ? (
            <span>Redirecting...</span>
          ) : (
            <span>Reset Password</span>
          )}
        </button>

        {!resetMutation.isSuccess && (
          <button
            type="button"
            onClick={() => setStep('request')}
            className="flex w-full items-center justify-center space-x-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Change Email</span>
          </button>
        )}
      </form>
    </div>
  );
}
