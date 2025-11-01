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
  Heart,
  Stethoscope,
  Clock,
  CheckCircle,
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <Card className="mx-auto max-w-5xl animate-pulse">
          <CardHeader>
            <div className="h-6 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
          </CardHeader>
          <CardContent>
            <div className="h-40 rounded bg-gray-200 dark:bg-gray-700" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <Card className="mx-auto max-w-5xl">
          <CardContent className="pt-6">
            <p className="text-red-600">Failed to load doctor profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Hero Section with Doctor Info */}
        <Card className="overflow-hidden border-none bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
              {/* Doctor Avatar - Large and Prominent */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-white opacity-30 blur-sm"></div>
                <Avatar className="relative h-32 w-32 border-4 border-white shadow-xl">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.name}`}
                  />
                  <AvatarFallback className="bg-white text-4xl font-bold text-blue-600">
                    {doctor.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 rounded-full border-4 border-white bg-green-500 p-2 shadow-lg">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* Doctor Details */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="mb-2 text-4xl font-bold">Dr. {doctor.name}</h1>
                <div className="mb-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  <Badge className="border-white/30 bg-white/20 px-4 py-1 text-base text-white">
                    <Stethoscope className="mr-2 h-4 w-4" />
                    {doctor.specialty}
                  </Badge>
                  <Badge className="border-yellow-600 bg-yellow-500 px-4 py-1 text-base text-white">
                    <Star className="mr-2 h-4 w-4 fill-white" />
                    {doctor.rating.toFixed(1)} Rating
                  </Badge>
                </div>
                {doctor.location && (
                  <p className="mb-4 flex items-center justify-center gap-2 text-lg text-white/90 md:justify-start">
                    <MapPin className="h-5 w-5" /> {doctor.location}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
                  <Link href={`/appointments?doctor=${doctor.id}`} className="flex-1 md:flex-none">
                    <Button
                      size="lg"
                      className="w-full bg-white font-semibold text-blue-600 shadow-lg hover:bg-blue-50 md:w-auto"
                    >
                      <Calendar className="mr-2 h-5 w-5" />
                      Book Appointment
                    </Button>
                  </Link>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => router.back()}
                    className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                  >
                    Back to Doctors
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-blue-500 transition-shadow hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                  <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Experience</p>
                  <p className="text-xl font-bold">10+ Years</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 transition-shadow hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                  <Heart className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patient Satisfaction</p>
                  <p className="text-xl font-bold">{Math.round(doctor.rating * 20)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 transition-shadow hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
                  <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Wait Time</p>
                  <p className="text-xl font-bold">15 mins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Qualifications Section */}
        {doctor.qualifications && (
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 p-3">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Qualifications</CardTitle>
                  <CardDescription>Professional credentials and certifications</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-6 dark:bg-blue-900/10">
                <p className="text-base leading-relaxed">{doctor.qualifications}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Biography Section */}
        {doctor.bio && (
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-green-500 to-teal-500 p-3">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">About Dr. {doctor.name}</CardTitle>
                  <CardDescription>Professional background and expertise</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed text-muted-foreground">{doctor.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Call to Action */}
        <Card className="border-none bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl">
          <CardContent className="p-8 text-center">
            <h3 className="mb-2 text-2xl font-bold">Ready to Book an Appointment?</h3>
            <p className="mb-6 text-white/90">Get expert medical care from Dr. {doctor.name}</p>
            <Link href={`/appointments?doctor=${doctor.id}`}>
              <Button
                size="lg"
                className="bg-white font-semibold text-blue-600 shadow-lg hover:bg-blue-50"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Schedule Your Visit Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
