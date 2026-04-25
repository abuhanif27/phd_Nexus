'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '../hooks';
import { LoginInput, loginSchema } from '../schemas';
import { Mail, Lock, LogIn, AlertCircle, RotateCcw } from 'lucide-react';

export function LoginForm() {
  const { mutate: login, isPending, error } = useLogin();
  const [isNetworkError, setIsNetworkError] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  React.useEffect(() => {
    // Check if error is a network error
    if (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setIsNetworkError(
        errorMsg.includes('Backend server') ||
        errorMsg.includes('Network connection') ||
        errorMsg.includes('not responding')
      );
    }
  }, [error]);

  const onSubmit = (data: LoginInput) => {
    login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6 sm:mt-8">
      <div className="rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:p-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-start space-x-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/70 dark:bg-red-950/50">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {isNetworkError ? 'Connection failed' : 'Login failed'}
              </p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {error instanceof Error ? error.message : 'Invalid email or password'}
              </p>
              {isNetworkError && (
                <button
                  type="button"
                  onClick={() => {
                    const form = document.querySelector('form');
                    if (form) {
                      form.dispatchEvent(new Event('submit', { bubbles: true }));
                    }
                  }}
                  disabled={isPending}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  <RotateCcw className="h-3 w-3" />
                  Try again
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                disabled={isPending}
                {...register('email')}
                className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder-gray-400 dark:disabled:bg-slate-800/70"
                placeholder="your.email@example.com"
              />
            </div>
            {errors.email && (
              <p className="mt-2 flex items-center space-x-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.email.message}</span>
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <a
                href="#"
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-500"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                disabled={isPending}
                {...register('password')}
                className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder-gray-400 dark:disabled:bg-slate-800/70"
                placeholder="••••••••••••"
              />
            </div>
            {errors.password && (
              <p className="mt-2 flex items-center space-x-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.password.message}</span>
              </p>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Remember me for 30 days
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={isPending}
            className="group relative flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-2xl transition-all hover:scale-105 hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {isPending ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                <span>Sign in to your account</span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-500 dark:bg-slate-900 dark:text-gray-400">
              Quick access for demo
            </span>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              const form = document.querySelector('form');
              if (form) {
                (form.querySelector('#email') as HTMLInputElement).value = 'patient@example.com';
                (form.querySelector('#password') as HTMLInputElement).value = 'Pass1234!';
              }
            }}
            className="rounded-lg border-2 border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            Demo Patient
          </button>
          <button
            type="button"
            onClick={() => {
              const form = document.querySelector('form');
              if (form) {
                (form.querySelector('#email') as HTMLInputElement).value = 'doctor@example.com';
                (form.querySelector('#password') as HTMLInputElement).value = 'Pass1234!';
              }
            }}
            className="rounded-lg border-2 border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
          >
            Demo Doctor
          </button>
        </div>
      </div>
    </form>
  );
}
