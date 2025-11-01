'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Activity,
  Heart,
  Thermometer,
  Weight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Pill,
  Shield,
  Sparkles,
  Brain,
  Download,
  Share2,
  Clock,
  Target,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function HealthSummaryPage() {
  // Mock data - replace with actual API calls
  const [healthScore] = useState(85);

  const vitalSigns = [
    {
      label: 'Blood Pressure',
      value: '120/80',
      unit: 'mmHg',
      status: 'normal',
      trend: 'stable',
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      lastUpdated: '2 hours ago',
    },
    {
      label: 'Heart Rate',
      value: '72',
      unit: 'bpm',
      status: 'normal',
      trend: 'down',
      icon: Activity,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-950/20',
      lastUpdated: '2 hours ago',
    },
    {
      label: 'Temperature',
      value: '98.6',
      unit: '°F',
      status: 'normal',
      trend: 'stable',
      icon: Thermometer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      lastUpdated: '3 hours ago',
    },
    {
      label: 'Weight',
      value: '165',
      unit: 'lbs',
      status: 'normal',
      trend: 'up',
      icon: Weight,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      lastUpdated: '1 day ago',
    },
  ];

  const conditions = [
    {
      name: 'Type 2 Diabetes',
      severity: 'moderate',
      status: 'managed',
      diagnosed: '2020-03-15',
    },
    { name: 'Hypertension', severity: 'mild', status: 'managed', diagnosed: '2019-08-20' },
  ];

  const medications = [
    {
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      status: 'active',
      nextDose: 'Today, 6:00 PM',
    },
    {
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      status: 'active',
      nextDose: 'Tomorrow, 8:00 AM',
    },
  ];

  const allergies = [
    { allergen: 'Penicillin', reaction: 'Rash', severity: 'severe' },
    { allergen: 'Peanuts', reaction: 'Anaphylaxis', severity: 'severe' },
  ];

  const aiInsights = [
    'Your blood pressure has been consistently normal for the past 3 months',
    'Consider increasing physical activity to 150 minutes per week',
    "Schedule your annual checkup - it's been 11 months",
    'Your medication adherence is excellent at 95%',
  ];

  const upcomingAppointments = [
    {
      doctor: 'Dr. Sarah Smith',
      specialty: 'Endocrinologist',
      date: '2025-11-10',
      time: '10:00 AM',
      type: 'Follow-up',
    },
    {
      doctor: 'Dr. John Doe',
      specialty: 'Cardiologist',
      date: '2025-11-15',
      time: '2:30 PM',
      type: 'Routine Checkup',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
      case 'critical':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild':
        return 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20';
      case 'moderate':
        return 'border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/20';
      case 'severe':
        return 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/20';
      default:
        return 'border-gray-300 bg-gray-50 text-gray-700 dark:bg-gray-950/20';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Health Summary</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Your comprehensive health overview powered by AI
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Health Score Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-blue-600 p-2">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Overall Health Score
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Based on your vitals, activity, and health records
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-blue-600">{healthScore}</span>
                  <span className="text-2xl text-gray-500">/100</span>
                </div>
                <Progress value={healthScore} className="mt-3 h-3" />
                <p className="mt-2 text-sm font-medium text-green-600">
                  Excellent! Keep up the great work 🎉
                </p>
              </div>
            </div>
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-blue-600 bg-white dark:bg-gray-900">
              <div className="text-center">
                <Target className="mx-auto h-8 w-8 text-blue-600" />
                <p className="mt-1 text-xs font-medium text-gray-600">On Track</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Vitals & Conditions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Vital Signs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Vital Signs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {vitalSigns.map((vital) => {
                  const Icon = vital.icon;
                  return (
                    <Card key={vital.label} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3">
                            <div className={`rounded-full p-2 ${vital.bgColor}`}>
                              <Icon className={`h-5 w-5 ${vital.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {vital.label}
                              </p>
                              <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {vital.value}
                                </span>
                                <span className="text-sm text-gray-500">{vital.unit}</span>
                              </div>
                              <p className="mt-1 text-xs text-gray-500">{vital.lastUpdated}</p>
                            </div>
                          </div>
                          {getTrendIcon(vital.trend)}
                        </div>
                        <Badge variant="outline" className={`mt-3 ${getStatusColor(vital.status)}`}>
                          {vital.status.charAt(0).toUpperCase() + vital.status.slice(1)}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Conditions & Medications Tabs */}
          <Tabs defaultValue="conditions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
              <TabsTrigger value="medications">Medications</TabsTrigger>
              <TabsTrigger value="allergies">Allergies</TabsTrigger>
            </TabsList>

            <TabsContent value="conditions" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {conditions.map((condition, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex gap-3">
                          <div className="mt-1">
                            {condition.status === 'managed' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-yellow-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {condition.name}
                            </h4>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              Diagnosed: {format(new Date(condition.diagnosed), 'MMM d, yyyy')}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <Badge
                                variant="outline"
                                className={getSeverityColor(condition.severity)}
                              >
                                {condition.severity}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {condition.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medications" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {medications.map((med, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20"
                      >
                        <div className="flex gap-3">
                          <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                            <Pill className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {med.name}
                            </h4>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              {med.dosage} • {med.frequency}
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                              <Clock className="h-3 w-3" />
                              Next dose: {med.nextDose}
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-green-600">Active</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="allergies" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {allergies.map((allergy, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20"
                      >
                        <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {allergy.allergen}
                          </h4>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Reaction: {allergy.reaction}
                          </p>
                          <Badge
                            variant="outline"
                            className="mt-2 border-red-300 bg-red-100 text-red-700"
                          >
                            {allergy.severity} severity
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - AI Insights & Appointments */}
        <div className="space-y-6">
          {/* AI Insights */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {aiInsights.map((insight, index) => (
                  <div
                    key={index}
                    className="flex gap-3 rounded-lg bg-purple-50 p-3 dark:bg-purple-950/20"
                  >
                    <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-600" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">{insight}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {upcomingAppointments.map((apt, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {apt.doctor}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{apt.specialty}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(apt.date), 'MMM d, yyyy')} • {apt.time}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {apt.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-6">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Shield className="h-4 w-4" />
                Update Medical History
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Activity className="h-4 w-4" />
                Log Vital Signs
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Calendar className="h-4 w-4" />
                Schedule Checkup
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
