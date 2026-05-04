'use client';

import { useMemo } from 'react';
import { BarChart3, Building2, Calculator, Plus, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { calculateHospitalMetrics } from '@/features/portal/utils';
import { usePortalStore } from '@/store/usePortalStore';

export function HospitalWorkspace() {
  const activeProfileId = usePortalStore((state) => state.activeProfileId);
  const profiles = usePortalStore((state) => state.profiles);
  const hospitalWorkspaces = usePortalStore((state) => state.hospitalWorkspaces);
  const updateHospitalRow = usePortalStore((state) => state.updateHospitalRow);
  const addHospitalRow = usePortalStore((state) => state.addHospitalRow);

  const profile = useMemo(
    () => profiles.find((item) => item.id === activeProfileId && item.role === 'hospital') ?? null,
    [activeProfileId, profiles]
  );
  const workspace = profile ? hospitalWorkspaces[profile.id] : undefined;
  const metrics = calculateHospitalMetrics(workspace?.rows ?? []);

  if (!profile || !workspace) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hospital operations dashboard</h1>
          <p className="text-muted-foreground">
            Excel-like operational inputs with instant KPI calculations and dashboard-style output.
          </p>
        </div>
        <Badge className="bg-slate-900 text-white hover:bg-slate-900">
          {profile.hospitalName || profile.name}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Building2}
          label="Total patients"
          value={metrics.totalPatients.toString()}
        />
        <MetricCard
          icon={TrendingUp}
          label="Net revenue"
          value={`৳ ${metrics.netRevenue.toLocaleString()}`}
        />
        <MetricCard icon={BarChart3} label="Occupancy rate" value={`${metrics.occupancyRate}%`} />
        <MetricCard
          icon={Calculator}
          label="Avg wait"
          value={`${metrics.averageWaitMinutes} min`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Spreadsheet input board</CardTitle>
                <CardDescription>
                  Update department inputs and the result cards will refresh automatically.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => addHospitalRow(profile.id)}>
                <Plus className="mr-2 h-4 w-4" /> Add row
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Patients</th>
                  <th className="px-3 py-2">Revenue</th>
                  <th className="px-3 py-2">Expenses</th>
                  <th className="px-3 py-2">Beds</th>
                  <th className="px-3 py-2">Occupied</th>
                  <th className="px-3 py-2">Doctors</th>
                  <th className="px-3 py-2">Wait</th>
                  <th className="px-3 py-2">Tests</th>
                </tr>
              </thead>
              <tbody>
                {workspace.rows.map((row) => (
                  <tr key={row.id} className="border-b align-top">
                    <td className="px-3 py-3">
                      <Input
                        value={row.department}
                        onChange={(event) =>
                          updateHospitalRow(profile.id, row.id, { department: event.target.value })
                        }
                      />
                    </td>
                    {[
                      ['patients', row.patients],
                      ['revenue', row.revenue],
                      ['expenses', row.expenses],
                      ['beds', row.beds],
                      ['occupiedBeds', row.occupiedBeds],
                      ['doctors', row.doctors],
                      ['avgWaitMinutes', row.avgWaitMinutes],
                      ['testsRun', row.testsRun],
                    ].map(([field, value]) => (
                      <td key={field} className="px-3 py-3">
                        <Input
                          type="number"
                          value={value}
                          onChange={(event) =>
                            updateHospitalRow(profile.id, row.id, {
                              [field]: Number(event.target.value),
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <CardTitle>Auto-calculated results</CardTitle>
              <CardDescription>
                Professional dashboard summary from the sheet inputs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <ResultLine
                label="Gross revenue"
                value={`৳ ${metrics.totalRevenue.toLocaleString()}`}
              />
              <ResultLine
                label="Operating expense"
                value={`৳ ${metrics.totalExpenses.toLocaleString()}`}
              />
              <ResultLine
                label="Revenue per doctor"
                value={`৳ ${metrics.revenuePerDoctor.toLocaleString()}`}
              />
              <ResultLine label="Tests per patient" value={metrics.testsPerPatient.toString()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department performance</CardTitle>
              <CardDescription>
                Visual comparison similar to a professional analytics board.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.rows.map((row) => {
                const width =
                  metrics.totalRevenue > 0 ? (row.revenue / metrics.totalRevenue) * 100 : 0;
                return (
                  <div key={row.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span>{row.department}</span>
                      <span className="text-muted-foreground">
                        ৳ {row.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ResultLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
