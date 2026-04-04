'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { Briefcase, Eye, Plus } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';

const JOB_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  expired: 'Expired',
};

export default function RecruiterJobsPage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/api/jobs/my/listings?page=1&limit=50');
        setJobs(response.data?.data || []);
      } catch (error) {
        toast.error('Failed to load jobs');
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchJobs();
    }
  }, [session]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-display font-black text-white">My Jobs</h1>
            <p className="text-text-secondary mt-2">Manage and review all your job postings.</p>
          </div>
          <Link href="/recruiter/jobs/new">
            <Button className="w-full sm:w-auto">
              <Plus size={16} className="mr-2" />
              Post New Job
            </Button>
          </Link>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Job Listings ({jobs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-bg-secondary animate-pulse" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-12 text-center">
                <Briefcase size={40} className="text-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No jobs posted yet</h3>
                <p className="text-sm text-text-secondary mb-4">Create your first listing to start receiving applications.</p>
                <Link href="/recruiter/jobs/new">
                  <Button>
                    <Plus size={16} className="mr-2" />
                    Post Job
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="w-full max-w-full overflow-x-auto">
                <table className="w-full min-w-[700px] lg:min-w-0">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-tertiary">Title</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-tertiary">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-tertiary">Applications</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-tertiary">Posted</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-tertiary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job._id} className="border-b border-border hover:bg-bg-secondary/40 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-bold text-white">
                              <Link href={`/recruiter/jobs/${job._id}/applications`} className="hover:underline">{job.title}</Link>
                            </p>
                            <p className="text-xs text-text-tertiary">{job.location || 'Location not set'}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="ghost" className="capitalize">
                            {JOB_STATUS_LABEL[job.status] || job.status || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-text-primary">{job.applicantCount ?? job.applicationCount ?? 0}</td>
                        <td className="py-3 px-4 text-text-secondary text-sm">
                          {job.createdAt ? format(new Date(job.createdAt), 'MMM d, yyyy') : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/recruiter/jobs/${job._id}/applications`}>
                            <Button variant="ghost" size="sm">
                              <Eye size={14} className="mr-1" />
                              Applicants
                            </Button>
                          </Link>
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
