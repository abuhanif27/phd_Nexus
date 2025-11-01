'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getDoctor } from '@/features/doctors/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Star, GraduationCap } from 'lucide-react';
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
      <div className="p-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-1/3 rounded bg-gray-200" />
          </CardHeader>
          <CardContent>
            <div className="h-40 rounded bg-gray-200" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="p-6">
        <Card>
          <CardContent>
            <p className="text-red-600">Failed to load doctor profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.name}`} />
            <AvatarFallback>
              {doctor.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Dr. {doctor.name}</h1>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Star className="h-4 w-4 text-yellow-400" /> {doctor.rating.toFixed(1)} •{' '}
              {doctor.specialty}
            </p>
            {doctor.location && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {doctor.location}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/appointments/new?doctor=${doctor.id}`}>
            <Button>
              <Calendar className="mr-2 h-4 w-4" /> Book Appointment
            </Button>
          </Link>
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Qualifications, bio and practice details</CardDescription>
        </CardHeader>
        <CardContent>
          {doctor.qualifications && (
            <div className="mb-4 flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Qualifications</h3>
                <p className="text-sm text-muted-foreground">{doctor.qualifications}</p>
              </div>
            </div>
          )}

          {doctor.bio && (
            <div className="mb-4">
              <h3 className="font-semibold">Biography</h3>
              <p className="text-sm text-muted-foreground">{doctor.bio}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold">Practice Information</h3>
            <p className="text-sm text-muted-foreground">Rating: {doctor.rating.toFixed(1)}</p>
            {doctor.location && (
              <p className="text-sm text-muted-foreground">Location: {doctor.location}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
