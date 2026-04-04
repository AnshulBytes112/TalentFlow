'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardUserPanel from '@/components/layout/DashboardUserPanel';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

type Application = {
  _id: string;
  job?: { title?: string };
  applicant?: { firstName?: string; lastName?: string; email?: string };
  status?: string;
  createdAt?: string;
};

export default function AdminApplicationsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/applications?limit=50&page=1');
      const list = res?.data?.data || [];
      setItems(list);
    } catch (err) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-display font-black text-white">Admin — Applications</h1>
          <DashboardUserPanel />
        </header>

        <Card>
          <CardHeader>
            <CardTitle>All Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-text-tertiary">Loading...</p>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full table-auto text-left">
                  <thead>
                    <tr className="text-sm text-text-tertiary">
                      <th className="px-3 py-2">Applicant</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Job</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Applied</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a) => (
                      <tr key={a._id} className="border-t border-border/40">
                        <td className="px-3 py-3">{a.applicant?.firstName} {a.applicant?.lastName}</td>
                        <td className="px-3 py-3">{a.applicant?.email}</td>
                        <td className="px-3 py-3">{a.job?.title || '-'}</td>
                        <td className="px-3 py-3">{a.status || 'unknown'}</td>
                        <td className="px-3 py-3">{a.createdAt ? new Date(a.createdAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
