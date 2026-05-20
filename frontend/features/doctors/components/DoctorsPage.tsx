'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getDoctors } from '@/features/doctors/api';
import { createConversation } from '@/features/chat/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  MapPin,
  Star,
  GraduationCap,
  Calendar,
  Heart,
  Brain,
  Stethoscope,
  Eye,
  Baby,
  Activity,
  Users,
  Bone,
  Pill,
  Smile,
  MessageSquare,
} from 'lucide-react';
import type { Doctor } from '@/types/api';

// Specialty categories with icons and colors
const SPECIALTY_CATEGORIES = [
  {
    name: 'All Specialties',
    value: '',
    icon: Users,
    color: 'bg-gray-500',
  },
  {
    name: 'Cardiology',
    value: 'Cardiology',
    icon: Heart,
    color: 'bg-red-500',
  },
  {
    name: 'Neurology',
    value: 'Neurology',
    icon: Brain,
    color: 'bg-purple-500',
  },
  {
    name: 'General Practice',
    value: 'General Practice',
    icon: Stethoscope,
    color: 'bg-blue-500',
  },
  {
    name: 'Ophthalmology',
    value: 'Ophthalmology',
    icon: Eye,
    color: 'bg-cyan-500',
  },
  {
    name: 'Pediatrics',
    value: 'Pediatrics',
    icon: Baby,
    color: 'bg-pink-500',
  },
  {
    name: 'Orthopedics',
    value: 'Orthopedics',
    icon: Bone,
    color: 'bg-orange-500',
  },
  {
    name: 'Dermatology',
    value: 'Dermatology',
    icon: Activity,
    color: 'bg-green-500',
  },
  {
    name: 'Psychiatry',
    value: 'Psychiatry',
    icon: Smile,
    color: 'bg-indigo-500',
  },
  {
    name: 'Internal Medicine',
    value: 'Internal Medicine',
    icon: Pill,
    color: 'bg-teal-500',
  },
];

export function DoctorsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Fetch doctors with filters
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'doctors',
      { search: searchQuery, specialty: selectedSpecialty, location: locationFilter },
    ],
    queryFn: () =>
      getDoctors({
        search: searchQuery || undefined,
        specialty: selectedSpecialty || undefined,
      }),
  });

  const doctors: Doctor[] = data?.results || [];

  // Apply location filter on client side since backend supports it
  const filteredDoctors = locationFilter
    ? doctors.filter((doctor) =>
        doctor.location?.toLowerCase().includes(locationFilter.toLowerCase())
      )
    : doctors;

  // Get doctor initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get specialty category info
  const getSpecialtyInfo = (specialty: string) => {
    return (
      SPECIALTY_CATEGORIES.find((cat) => cat.value === specialty) ||
      SPECIALTY_CATEGORIES.find((cat) => cat.value === 'General Practice')!
    );
  };

  const handleMessageDoctor = async (e: React.MouseEvent, doctorUserId: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await createConversation(doctorUserId);
      // If backend returns the conversation object directly
      const conversationId = response.id;
      router.push(`/messages?id=${conversationId}`);
    } catch (error) {
      console.error('Failed to initiate conversation:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Explore Doctors</h1>
        <p className="text-muted-foreground">
          Search for specialists and book appointments with qualified healthcare professionals
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Doctors</CardTitle>
          <CardDescription>Filter by name, specialty, or location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search by name */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter by location */}
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Clear filters */}
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedSpecialty('');
                setLocationFilter('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Specialty Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Browse by Specialty</CardTitle>
          <CardDescription>Select a medical specialty to find specialists</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Category Grid */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {SPECIALTY_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedSpecialty === category.value;
              return (
                <button
                  key={category.value}
                  onClick={() => setSelectedSpecialty(category.value)}
                  className={`flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <div className={`rounded-full p-3 ${category.color} bg-opacity-10`}>
                    <Icon className={`h-6 w-6 ${category.color.replace('bg-', 'text-')}`} />
                  </div>
                  <span className="line-clamp-2 text-center text-sm font-medium leading-tight">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {selectedSpecialty ? `${selectedSpecialty} Specialists` : 'All Doctors'}{' '}
            <span className="text-lg text-muted-foreground">({filteredDoctors.length} found)</span>
          </h2>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">
                Failed to load doctors. Please try again later.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredDoctors.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="py-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No doctors found</h3>
                <p className="mb-4 text-muted-foreground">
                  Try adjusting your search filters or browse all specialties
                </p>
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSpecialty('');
                    setLocationFilter('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Doctor Cards */}
        {!isLoading && !error && filteredDoctors.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDoctors.map((doctor) => {
              const specialtyInfo = getSpecialtyInfo(doctor.specialty);
              const SpecialtyIcon = specialtyInfo.icon;

              return (
                <Card
                  key={doctor.id}
                  className="group cursor-pointer transition-all hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.name}`}
                          />
                          <AvatarFallback className={`${specialtyInfo.color} text-white`}>
                            {getInitials(doctor.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg transition-colors group-hover:text-primary">
                            Dr. {doctor.name}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-1">
                            <SpecialtyIcon className="h-3 w-3" />
                            <span>{doctor.specialty}</span>
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{doctor.rating.toFixed(1)}</span>
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Qualifications */}
                    {doctor.qualifications && (
                      <div className="flex items-start space-x-2 text-sm">
                        <GraduationCap className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <p className="line-clamp-2 text-muted-foreground">
                          {doctor.qualifications}
                        </p>
                      </div>
                    )}

                    {/* Bio */}
                    {doctor.bio && (
                      <p className="line-clamp-3 text-sm text-muted-foreground">{doctor.bio}</p>
                    )}

                    {/* Location */}
                    {doctor.location && (
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{doctor.location}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/appointments?doctor=${doctor.id}`} className="flex-1">
                        <Button className="w-full" size="sm">
                          <Calendar className="mr-2 h-4 w-4" />
                          Book Appointment
                        </Button>
                      </Link>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => handleMessageDoctor(e, doctor.user)}
                        title="Message Doctor"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>

                      <Link href={`/doctors/${doctor.id}`}>
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
