'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getDoctor } from '@/features/doctors/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  Star,
  GraduationCap,
  Award,
  Users,
  Clock,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';
import Link from 'next/link';

export default function DoctorProfilePage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const {
    data: doctor,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => getDoctor(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
            </CardHeader>
            <CardContent>
              <div className="h-48 rounded bg-gray-200 dark:bg-gray-800" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl">
          <Card>
            <CardContent className="pt-6">
              <p className="text-red-600">Failed to load doctor profile.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        {/* Header Section */}
        <Card className="border-t-4 border-t-blue-600">
          <CardContent className="p-8">
            <div className="flex flex-col gap-8 lg:flex-row">
              {/* Doctor Avatar & Basic Info */}
              <div className="flex flex-col items-center gap-4 lg:items-start">
                <div className="relative">
                  <Avatar className="h-40 w-40 border-4 border-gray-200 dark:border-gray-700">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.name}`}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-blue-50 text-3xl font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {doctor.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 rounded-full border-4 border-white bg-green-600 p-1.5 dark:border-gray-950">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="text-center lg:text-left">
                  <Badge variant="secondary" className="text-xs font-medium">
                    Verified Provider
                  </Badge>
                </div>
              </div>

              {/* Doctor Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
                    Dr. {doctor.name}
                  </h1>
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                    {doctor.specialty}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                    <span className="text-lg font-semibold">{doctor.rating.toFixed(1)}</span>
                    <span className="text-sm text-gray-500">/ 5.0</span>
                  </div>
                  {doctor.location && (
                    <div className="ml-4 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <span>{doctor.location}</span>
                    </div>
                  )}
                </div>

                <div className="my-4 h-px bg-gray-200 dark:bg-gray-800" />

                <div className="flex flex-wrap gap-3">
                  <Link href={`/appointments?doctor=${doctor.id}`}>
                    <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700">
                      <Calendar className="mr-2 h-5 w-5" />
                      Book Appointment
                    </Button>
                  </Link>
                  <Button size="lg" variant="outline" onClick={() => router.back()}>
                    Back to Directory
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-blue-600">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                  <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Experience
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">10+ Years</p>
                  <p className="mt-1 text-xs text-gray-500">In medical practice</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Patients
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">500+</p>
                  <p className="mt-1 text-xs text-gray-500">Successfully treated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-950">
                  <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Response Time
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">24 hours</p>
                  <p className="mt-1 text-xs text-gray-500">Average response</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Qualifications Section */}
        {doctor.qualifications && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950">
                  <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Education & Qualifications</CardTitle>
                  <CardDescription>Professional credentials</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                  {doctor.qualifications}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Biography Section */}
        {doctor.bio && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-50 p-2 dark:bg-green-950">
                  <Briefcase className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Professional Background</CardTitle>
                  <CardDescription>About Dr. {doctor.name}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <p className="leading-relaxed text-gray-700 dark:text-gray-300">{doctor.bio}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Practice Information Card */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-600 p-4">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Schedule a Consultation
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Book an appointment with Dr. {doctor.name}
                  </p>
                </div>
              </div>
              <Link href={`/appointments?doctor=${doctor.id}`}>
                <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700">
                  Book Appointment
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
