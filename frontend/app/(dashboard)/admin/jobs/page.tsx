'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardUserPanel from '@/components/layout/DashboardUserPanel';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

type Job = {
  _id: string;
  title: string;
  company?: any;
  status?: string;
  applicantsCount?: number;
  applicantCount?: number;
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/jobs?limit=50&page=1');
      const list = res?.data?.data || [];
      setJobs(list);
    } catch (err) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const closeJob = async (id: string) => {
    try {
      await api.patch(`/api/jobs/${id}/close`);
      setJobs((prev) => prev.map((j) => (j._id === id ? { ...j, status: 'closed' } : j)));
      toast.success('Job closed');
    } catch (err) {
      toast.error('Failed to close job');
    }
  };

  const deleteJob = async (id: string) => {
    if (!confirm('Delete this job?')) return;
    try {
      await api.delete(`/api/jobs/${id}`);
      setJobs((prev) => prev.filter((j) => j._id !== id));
      toast.success('Job deleted');
    } catch (err) {
      toast.error('Failed to delete job');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-display font-black text-white">Admin — Jobs</h1>
          <DashboardUserPanel />
        </header>

        <Card>
          <CardHeader>
            <CardTitle>All Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-text-tertiary">Loading jobs...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-left">
                  <thead>
                    <tr className="text-sm text-text-tertiary">
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Company</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Applicants</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j) => (
                      <tr key={j._id} className="border-t border-border/40">
                        <td className="px-3 py-3">{j.title}</td>
                        <td className="px-3 py-3">{j.company?.name || '-'}</td>
                        <td className="px-3 py-3">{j.status || 'unknown'}</td>
                        <td className="px-3 py-3">{j.applicantCount ?? j.applicantsCount ?? 0}</td>
                        <td className="px-3 py-3 flex gap-2">
                          <Button size="sm" onClick={() => closeJob(j._id)}>Close</Button>
                          <Button size="sm" variant="danger" onClick={() => deleteJob(j._id)}>Delete</Button>
                        </td>
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
