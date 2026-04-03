'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardUserPanel from '@/components/layout/DashboardUserPanel';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';

const AdminAnalyticsCharts = dynamic(() => import('@/components/admin/AdminAnalyticsCharts'), {
  ssr: false,
  loading: () => (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="min-h-[360px] animate-pulse bg-bg-card">
          <CardContent className="h-[320px]" />
        </Card>
      ))}
    </div>
  ),
});

type AdminAnalytics = {
  totalUsers: number;
  totalRecruiters: number;
  totalJobseekers: number;
  totalJobs: number;
  totalApplications: number;
  platformConversionRate: string | number;
  newUsersLast30Days?: Array<{ _id: string; count: number }>;
  newUsersLast30DaysByRole?: Array<{ _id: { date: string; role: string }; count: number }>;
  applicationsLast30Days?: Array<{ _id: string; count: number }>;
  topRecruiters?: Array<{ name: string; company?: string; applicationCount: number }>;
  topSkillsInDemand?: Array<{ _id: string; count: number }>;
};

const KPI = ({ label, value, subtitle }: { label: string; value: React.ReactNode; subtitle?: string }) => (
  <Card>
    <CardContent className="p-6 space-y-2">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">{label}</p>
      <div className="text-3xl font-black text-white font-display">{value}</div>
      {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
    </CardContent>
  </Card>
);

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/analytics/admin');
        setData(res?.data?.data || null);
      } catch (error) {
        toast.error('Failed to load admin analytics');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge variant="screening" className="px-3 py-1 text-[10px] uppercase font-black tracking-widest bg-accent-primary/10 text-accent-primary border-none">
              Platform Admin
            </Badge>
            <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-none">
              Admin Dashboard
            </h1>
            <p className="text-text-secondary font-medium tracking-tight">
              Platform-wide activity, growth, and hiring signals.
            </p>
          </div>
          <DashboardUserPanel />
        </header>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="min-h-[120px] animate-pulse">
                <CardContent className="p-6 space-y-3">
                  <div className="h-3 w-28 rounded bg-bg-elevated" />
                  <div className="h-8 w-24 rounded bg-bg-elevated" />
                  <div className="h-4 w-40 rounded bg-bg-elevated" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <KPI label="Total Users" value={data?.totalUsers ?? 0} />
              <KPI label="Total Recruiters" value={data?.totalRecruiters ?? 0} />
              <KPI label="Total Jobseekers" value={data?.totalJobseekers ?? 0} />
              <KPI label="Total Jobs" value={data?.totalJobs ?? 0} />
              <KPI label="Total Applications" value={data?.totalApplications ?? 0} />
              <KPI label="Platform Conversion Rate" value={`${data?.platformConversionRate ?? 0}%`} subtitle="Offers divided by total applications" />
            </div>

            {data && <AdminAnalyticsCharts data={data} />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}