import Link from 'next/link';
import {
  Brain,
  Shield,
  Zap,
  Heart,
  Activity,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Premium Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/20 bg-white/80 backdrop-blur-xl">
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
                className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600"
              >
                Features
              </Link>
              <Link
                href="#ai-analysis"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600"
              >
                AI Analysis
              </Link>
              <Link
                href="#dashboard"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600"
              >
                Dashboard
              </Link>
              <Link
                href="#about"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600"
              >
                About
              </Link>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered Healthcare Assistant</span>
              </div>

              <h1 className="text-5xl font-bold leading-tight tracking-tight text-gray-900 lg:text-6xl">
                Your Health,
                <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Intelligently Analyzed
                </span>
              </h1>

              <p className="text-xl leading-relaxed text-gray-600">
                Advanced AI analysis for symptom understanding, specialist recommendations, and
                comprehensive health insights. Privacy-first, locally-powered, instant results.
              </p>

              {/* Key Features */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Quick Analysis</p>
                    <p className="text-sm text-gray-600">Results in 1-2 seconds</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Deep Learning</p>
                    <p className="text-sm text-gray-600">85-95% accuracy</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900">100% Private</p>
                    <p className="text-sm text-gray-600">All data stays local</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900">No Subscription</p>
                    <p className="text-sm text-gray-600">Free forever</p>
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
                  className="inline-flex items-center justify-center space-x-2 rounded-xl border-2 border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition-all hover:border-blue-600 hover:text-blue-600"
                >
                  <span>Sign In</span>
                </Link>
              </div>
            </div>

            {/* Right Content - Feature Cards */}
            <div className="relative">
              <div className="grid gap-6">
                {/* AI Analysis Card */}
                <div className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                  <div className="flex items-start space-x-4">
                    <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">AI Symptom Analysis</h3>
                      <p className="mt-2 text-sm text-gray-600">
                        Advanced NLP extracts medical entities and provides intelligent specialist
                        recommendations
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Mode Card */}
                <div className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                  <div className="flex items-start space-x-4">
                    <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-3 shadow-lg">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">Quick Answer Mode</h3>
                      <p className="mt-2 text-sm text-gray-600">
                        Fast sklearn analysis in 1-2 seconds for simple symptoms and urgent needs
                      </p>
                    </div>
                  </div>
                </div>

                {/* Deep Analysis Card */}
                <div className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                  <div className="flex items-start space-x-4">
                    <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-3 shadow-lg">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">Deep Analysis Mode</h3>
                      <p className="mt-2 text-sm text-gray-600">
                        Comprehensive PyTorch + medical history review with 85-95% accuracy
                      </p>
                    </div>
                  </div>
                </div>

                {/* Privacy Card */}
                <div className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                  <div className="flex items-start space-x-4">
                    <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-600 p-3 shadow-lg">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">Privacy First</h3>
                      <p className="mt-2 text-sm text-gray-600">
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
              <p className="mt-2 text-sm font-medium text-gray-600">AI Accuracy</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">&lt;2s</p>
              <p className="mt-2 text-sm font-medium text-gray-600">Quick Analysis</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">100%</p>
              <p className="mt-2 text-sm font-medium text-gray-600">Private</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">$0</p>
              <p className="mt-2 text-sm font-medium text-gray-600">Per Month</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
