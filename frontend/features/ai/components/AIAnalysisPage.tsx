'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Brain,
  Zap,
  Sparkles,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Clock,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { analyzeSymptoms } from '../api';

const analysisSchema = z.object({
  symptoms: z.string().min(10, 'Please describe your symptoms in detail (at least 10 characters)'),
  mode: z.enum(['lite', 'pro']),
  includeHistory: z.boolean().default(false),
  includeMedicalRecords: z.boolean().default(false),
  includeImages: z.boolean().default(false),
});

type AnalysisFormData = z.infer<typeof analysisSchema>;

interface AnalysisResult {
  mode: 'lite' | 'pro';
  specialist: string;
  confidence: number;
  urgency: 'emergency' | 'urgent' | 'routine';
  reasoning?: string;
  recommendations: string[];
  disclaimer?: {
    warning: string;
    message: string;
    limitations: string[];
  };
  entities?: any[];
  nextSteps?: {
    action?: string;
    urgency?: string;
    preparation?: string[];
    monitoring?: string[];
  };
  processingTime: number;
}

export function AIAnalysisPage() {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [result, setResult] = React.useState<AnalysisResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedMode, setSelectedMode] = React.useState<'lite' | 'pro'>('lite');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisSchema),
    defaultValues: {
      symptoms: '',
      mode: 'lite',
      includeHistory: false,
      includeMedicalRecords: false,
      includeImages: false,
    },
  });

  const mode = watch('mode');

  React.useEffect(() => {
    setSelectedMode(mode);
  }, [mode]);

  const onSubmit = async (data: AnalysisFormData) => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setResult(null);

      const startTime = Date.now();

      // Call AI analysis API
      const response = await analyzeSymptoms({
        symptoms: data.symptoms,
        mode: data.mode === 'lite' ? 'quick' : 'deep',
        model: data.mode === 'lite' ? 'sklearn' : 'pytorch',
        include_history: data.includeHistory,
        include_medical_records: data.includeMedicalRecords,
        include_images: data.includeImages,
      });

      const processingTime = (Date.now() - startTime) / 1000;

      // Map backend response to frontend interface
      setResult({
        mode: data.mode,
        specialist: response.analysis?.recommended_specialist || 'General Practitioner',
        confidence: response.analysis?.confidence || 0,
        urgency: response.next_steps?.urgency || 'routine',
        reasoning: response.analysis?.reasoning || '',
        recommendations: response.recommendations || [],
        disclaimer: response.disclaimer,
        entities: response.analysis?.extracted_symptoms || [],
        nextSteps: response.next_steps || {},
        processingTime,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-500';
      case 'urgent':
        return 'bg-orange-500';
      case 'routine':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          AI Health Analysis
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Get instant insights from our advanced AI models - choose between quick analysis or
          comprehensive review
        </p>
      </div>

      {/* Model Selection Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Nexus Lite */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedMode === 'lite'
              ? 'ring-2 ring-blue-600 dark:ring-blue-500'
              : 'hover:ring-1 hover:ring-gray-300'
          }`}
          onClick={() => setSelectedMode('lite')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 p-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Nexus Lite</CardTitle>
                  <CardDescription>Quick Analysis</CardDescription>
                </div>
              </div>
              {selectedMode === 'lite' && <CheckCircle2 className="h-6 w-6 text-blue-600" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">1-2 seconds</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">85-90% accuracy</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fast initial assessment for simple symptoms. Perfect for quick specialist
              recommendations.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                Fast
              </Badge>
              <Badge variant="outline" className="text-xs">
                Lightweight
              </Badge>
              <Badge variant="outline" className="text-xs">
                Real-time
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Nexus Pro */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedMode === 'pro'
              ? 'ring-2 ring-purple-600 dark:ring-purple-500'
              : 'hover:ring-1 hover:ring-gray-300'
          }`}
          onClick={() => setSelectedMode('pro')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-3">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Nexus Pro</CardTitle>
                  <CardDescription>Deep Analysis</CardDescription>
                </div>
              </div>
              {selectedMode === 'pro' && <CheckCircle2 className="h-6 w-6 text-purple-600" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">5-15 seconds</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">92-96% accuracy</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comprehensive analysis with medical history, records, and advanced AI insights.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                High Accuracy
              </Badge>
              <Badge variant="outline" className="text-xs">
                Advanced
              </Badge>
              <Badge variant="outline" className="text-xs">
                Context-Aware
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Form */}
      <Card>
        <CardHeader>
          <CardTitle>Describe Your Symptoms</CardTitle>
          <CardDescription>
            Provide detailed information about what you're experiencing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Hidden mode field */}
            <input type="hidden" {...register('mode')} value={selectedMode} />

            {/* Symptoms Textarea */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Symptoms <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('symptoms')}
                rows={6}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Example: I've been experiencing a persistent headache for the past 3 days, along with mild fever (around 100°F) and occasional dizziness. The headache is worse in the morning and I feel nauseous..."
              />
              {errors.symptoms && (
                <p className="mt-2 flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.symptoms.message}</span>
                </p>
              )}
            </div>

            {/* Advanced Options (Pro Mode Only) */}
            {selectedMode === 'pro' && (
              <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/30 dark:bg-purple-950/20">
                <h3 className="flex items-center space-x-2 text-sm font-semibold text-purple-900 dark:text-purple-100">
                  <Brain className="h-5 w-5" />
                  <span>Advanced Analysis Options</span>
                </h3>

                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center space-x-3">
                    <input
                      type="checkbox"
                      {...register('includeHistory')}
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Include Medical History
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Previous diagnoses, chronic conditions, allergies
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center space-x-3">
                    <input
                      type="checkbox"
                      {...register('includeMedicalRecords')}
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Analyze Medical Records
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Lab results, prescriptions, encounter notes
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center space-x-3">
                    <input
                      type="checkbox"
                      {...register('includeImages')}
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <ImageIcon className="h-4 w-4 text-gray-500" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Process Medical Images (OCR)
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Extract text from uploaded medical documents
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isAnalyzing}
              className={`w-full ${
                selectedMode === 'pro'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing with {selectedMode === 'lite' ? 'Nexus Lite' : 'Nexus Pro'}...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-5 w-5" />
                  Analyze with {selectedMode === 'lite' ? 'Nexus Lite' : 'Nexus Pro'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">Analysis Error</h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Disclaimer */}
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 flex-shrink-0 text-orange-600 dark:text-orange-400" />
                <div className="flex-1">
                  <h3 className="font-bold text-orange-900 dark:text-orange-100">
                    {result.disclaimer?.warning || 'Medical Disclaimer'}
                  </h3>
                  <p className="mt-2 text-sm text-orange-800 dark:text-orange-200">
                    {result.disclaimer?.message ||
                      'This is an AI-powered analysis and should not replace professional medical advice.'}
                  </p>
                  {result.disclaimer?.limitations && result.disclaimer.limitations.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {result.disclaimer.limitations.map((limitation: string, idx: number) => (
                        <li key={idx} className="text-sm text-orange-700 dark:text-orange-300">
                          • {limitation}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-3">
                  {result.mode === 'lite' ? (
                    <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 p-2">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-2">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <span>
                    {result.mode === 'lite' ? 'Nexus Lite' : 'Nexus Pro'} Analysis Results
                  </span>
                </CardTitle>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Activity className="h-3 w-3" />
                  <span>{result.processingTime.toFixed(2)}s</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Specialist & Urgency */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Recommended Specialist
                  </h4>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {result.specialist}
                  </p>
                  <div className="mt-2">
                    <Badge variant="secondary">
                      {Math.round(result.confidence * 100)}% confident
                    </Badge>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Urgency Level
                  </h4>
                  <div className="mt-2 flex items-center space-x-3">
                    <div className={`h-3 w-3 rounded-full ${getUrgencyColor(result.urgency)}`} />
                    <span className="text-2xl font-bold capitalize text-gray-900 dark:text-white">
                      {result.urgency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reasoning (Pro only) */}
              {result.reasoning && (
                <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/30 dark:bg-purple-950/20">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                    AI Reasoning
                  </h4>
                  <p className="mt-2 text-sm text-purple-800 dark:text-purple-200">
                    {result.reasoning}
                  </p>
                </div>
              )}

              {/* Medical Entities */}
              {result.entities && result.entities.length > 0 && (
                <div>
                  <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
                    Detected Medical Entities
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.entities.map((entity: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-sm">
                        {entity.text || entity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
