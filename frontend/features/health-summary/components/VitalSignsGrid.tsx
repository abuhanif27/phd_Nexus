'use client';

import React from 'react';
import { Activity, LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VitalSignData {
  label: string;
  value: string;
  unit: string;
  status: string;
  trend?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  lastUpdated: string;
}

interface VitalSignsGridProps {
  vitalSigns: VitalSignData[];
  getTrendIcon: (trend?: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
}

export function VitalSignsGrid({ vitalSigns, getTrendIcon, getStatusColor }: VitalSignsGridProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Activity className="h-6 w-6 text-blue-600" />
          Vital Signs
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-6 md:grid-cols-2">
          {vitalSigns.map((vital) => {
            const Icon = vital.icon;
            return (
              <Card key={vital.label} className="border-2 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-1 gap-4">
                      <div className={`flex-shrink-0 rounded-full p-3 ${vital.bgColor}`}>
                        <Icon className={`h-6 w-6 ${vital.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-400">
                          {vital.label}
                        </p>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            {vital.value}
                          </span>
                          <span className="text-base text-gray-500">{vital.unit}</span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-gray-500">
                          {vital.lastUpdated}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">{getTrendIcon(vital.trend)}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`mt-4 px-3 py-1 ${getStatusColor(vital.status)}`}
                  >
                    {vital.status.charAt(0).toUpperCase() + vital.status.slice(1)}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
