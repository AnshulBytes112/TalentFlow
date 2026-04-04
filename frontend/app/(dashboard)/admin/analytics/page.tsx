'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardUserPanel from '@/components/layout/DashboardUserPanel';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import toast from 'react-hot-toast';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/analytics/admin');
      setData(res?.data?.data || null);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-display font-black text-white">Admin — Analytics</h1>
          <DashboardUserPanel />
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-24 rounded-2xl bg-bg-secondary/60 animate-pulse" />
                ))}
              </div>
            )}
            {!loading && data && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                  <h3 className="text-sm text-text-tertiary">Total Users</h3>
                  <p className="text-2xl font-bold text-white">{data.totalUsers ?? '-'}</p>
                </div>
                <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                  <h3 className="text-sm text-text-tertiary">Total Jobs</h3>
                  <p className="text-2xl font-bold text-white">{data.totalJobs ?? '-'}</p>
                </div>
                <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                  <h3 className="text-sm text-text-tertiary">Total Applications</h3>
                  <p className="text-2xl font-bold text-white">{data.totalApplications ?? '-'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
