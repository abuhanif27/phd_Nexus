'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Brain,
  Shield,
  Zap,
  Heart,
  Activity,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen scroll-smooth bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Premium Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/20 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-xl font-bold text-transparent">
                NexusCare
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden items-center space-x-8 md:flex">
              <Link
                href="#features"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-200"
              >
                Features
              </Link>
              <Link
                href="#ai-analysis"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-200"
              >
                Symptom Checker
              </Link>
              <Link
                href="#dashboard"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-200"
              >
                Dashboard
              </Link>
              <Link
                href="#about"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-200"
              >
                About
              </Link>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <ThemeToggle className="hover:bg-blue-50 dark:hover:bg-slate-800" />
              <button
                type="button"
                className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800 md:hidden"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Link
                href="/login"
                className="hidden rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800 sm:inline-flex"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:px-6"
              >
                Get Started
              </Link>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="border-t border-slate-200 py-3 dark:border-slate-800 md:hidden">
              <div className="grid gap-2">
                <Link
                  href="#features"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  href="#ai-analysis"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Symptom Checker
                </Link>
                <Link
                  href="#dashboard"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="dashboard" className="relative scroll-mt-24 px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered Healthcare Assistant</span>
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl lg:text-6xl">
                Your Health,
                <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Intelligently Analyzed
                </span>
              </h1>

              <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-300 sm:text-xl">
                Advanced Symptom Checker for understanding health concerns, specialist recommendations, and
                immediate diagnostic insights. Privacy-first, locally-powered, dataset-driven results.
              </p>

              {/* Key Features */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Quick Analysis</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Results in 1-2 seconds
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Deep Learning</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">85-95% accuracy</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">100% Private</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">All data stays local</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      No Subscription
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Free forever</p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-2xl transition-all hover:scale-105 hover:shadow-blue-500/50"
                >
                  <span>Start Analysis</span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center space-x-2 rounded-xl border-2 border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition-all hover:border-blue-600 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200"
                >
                  <span>Sign In</span>
                </Link>
              </div>
            </div>

            {/* Right Content - Feature Cards */}
            <div id="features" className="relative scroll-mt-24">
              <div className="grid gap-6">
                {/* Symptom Checker Card */}
                <div
                  id="ai-analysis"
                  className="group relative scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start space-x-4">
                    <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        AI Symptom Analysis
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        Advanced NLP extracts medical entities and provides intelligent specialist
                        recommendations
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Mode Card */}
                <div className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start space-x-4">
                    <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-3 shadow-lg">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Quick Answer Mode
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        Fast sklearn analysis in 1-2 seconds for simple symptoms and urgent needs
                      </p>
                    </div>
                  </div>
                </div>

                {/* Deep Analysis Card */}
                <div className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start space-x-4">
                    <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-3 shadow-lg">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Deep Analysis Mode
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        Comprehensive PyTorch + medical history review with 85-95% accuracy
                      </p>
                    </div>
                  </div>
                </div>

                {/* Privacy Card */}
                <div className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start space-x-4">
                    <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-600 p-3 shadow-lg">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Privacy First
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        All data stays on your computer. No cloud uploads, no subscriptions,
                        $0/month
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">85-95%</p>
              <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                AI Accuracy
              </p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">&lt;2s</p>
              <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                Quick Analysis
              </p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">100%</p>
              <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">Private</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">$0</p>
              <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">Per Month</p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 px-4 pb-24 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div className="max-w-3xl space-y-4">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                About NexusCare
              </h2>
              <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
                NexusCare combines patient records, scheduling, and AI-assisted symptom analysis in
                one local-first healthcare workspace. The landing page links now point to real
                sections on the page, while the app routes take users into the secured dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
