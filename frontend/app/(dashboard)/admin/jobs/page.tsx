'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardUserPanel from '@/components/layout/DashboardUserPanel';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { Briefcase, Search, Trash2, Users } from 'lucide-react';
import Input from '@/components/ui/Input';

type Job = {
  _id: string;
  title: string;
  company?: { name?: string; description?: string };
  status?: string;
  applicationCount?: number;
  applicantCount?: number;
  applicantsCount?: number;
  createdAt?: string;
  postedBy?: { firstName?: string; lastName?: string; email?: string };
  location?: string;
};

const STATUS_OPTIONS = ['draft', 'active', 'closed', 'expired'];

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/jobs?limit=100&page=1&sortBy=createdAt&sortOrder=desc');
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

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const recruiter = `${job.postedBy?.firstName || ''} ${job.postedBy?.lastName || ''}`.toLowerCase();
      const matchesSearch = !query || job.title.toLowerCase().includes(query) || recruiter.includes(query) || (job.company?.name || '').toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter]);

  const updateStatus = async (jobId: string, status: string) => {
    try {
      const res = await api.put(`/api/jobs/${jobId}`, { status });
      const updated = res?.data?.data;
      setJobs((prev) => prev.map((job) => (job._id === updated._id ? updated : job)));
      toast.success('Job status updated');
    } catch (error) {
      toast.error('Failed to update job status');
    }
  };

  const deleteJob = async () => {
    if (!jobToDelete) return;

    try {
      await api.delete(`/api/jobs/${jobToDelete._id}`);
      setJobs((prev) => prev.filter((job) => job._id !== jobToDelete._id));
      toast.success('Job deleted');
      setJobToDelete(null);
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-black text-white">Admin — Jobs</h1>
            <p className="text-text-secondary">Review jobs, recruiter ownership, and publication status.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="default">Total: {jobs.length}</Badge>
            <Badge variant="applied">Visible: {filteredJobs.length}</Badge>
            <DashboardUserPanel />
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase size={18} />
              Jobs Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1.5fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                <Input
                  label="Search jobs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, recruiter, or company"
                  className="pl-10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-border bg-bg-secondary px-4 py-3 text-sm text-white outline-none focus:border-accent-primary"
              >
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-20 rounded-2xl bg-bg-secondary/60 animate-pulse" />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-bg-secondary/30 px-6 py-16 text-center">
                <Users size={40} className="text-text-tertiary/60" />
                <div>
                  <h3 className="text-lg font-bold text-white">No jobs found</h3>
                  <p className="text-sm text-text-tertiary">Try a different search or filter.</p>
                </div>
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-3xl border border-border">
                <table className="w-full min-w-[920px] table-auto text-left xl:min-w-[1100px]">
                  <thead className="bg-bg-secondary/40">
                    <tr className="text-xs uppercase tracking-[0.25em] text-text-tertiary">
                      <th className="px-4 py-3">Job</th>
                      <th className="px-4 py-3">Recruiter</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Applicants</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job) => {
                      const recruiterName = `${job.postedBy?.firstName || ''} ${job.postedBy?.lastName || ''}`.trim() || job.postedBy?.email || 'Unknown recruiter';
                      return (
                        <tr key={job._id} className="border-t border-border/40">
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <p className="font-bold text-white">{job.title}</p>
                              <p className="text-xs text-text-tertiary">{job.location || 'No location'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-text-secondary">{recruiterName}</td>
                          <td className="px-4 py-4 text-sm text-text-secondary">{job.company?.name || '-'}</td>
                          <td className="px-4 py-4">
                            <select
                              value={job.status || 'draft'}
                              onChange={(e) => updateStatus(job._id, e.target.value)}
                              className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white outline-none"
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-4 text-sm text-text-secondary">{job.applicationCount ?? job.applicantCount ?? job.applicantsCount ?? 0}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="ghost" onClick={() => updateStatus(job._id, 'active')}>
                                Activate
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => updateStatus(job._id, 'closed')}>
                                Close
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => setJobToDelete(job)}>
                                <Trash2 size={14} className="mr-1" />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={!!jobToDelete}
        onClose={() => setJobToDelete(null)}
        title="Delete job"
        description={jobToDelete ? `Delete ${jobToDelete.title}? This action cannot be undone.` : ''}
      >
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setJobToDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => void deleteJob()}>Delete</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
