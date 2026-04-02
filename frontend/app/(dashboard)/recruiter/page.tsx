'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { 
  Briefcase, 
  Users, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  BarChart3,
  Calendar,
  Edit,
  Trash2,
  X,
  MoreHorizontal
} from 'lucide-react';
import api from '@/lib/axios';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal from '@/components/ui/Modal';

const JOB_STATUSES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-text-tertiary' },
  active: { label: 'Active', color: 'bg-accent-primary' },
  closed: { label: 'Closed', color: 'bg-accent-secondary' },
  expired: { label: 'Expired', color: 'bg-accent-danger' }
};

export default function RecruiterDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jobPage, setJobPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmJob, setConfirmJob] = useState<any | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, jobsRes, appsRes] = await Promise.all([
        api.get('/api/analytics/recruiter'),
        api.get(`/api/jobs/my/listings?page=${jobPage}&limit=10`),
        api.get('/api/applications/my/recent?limit=10')
      ]);
      
      setStats(statsRes.data.data);
      setJobs(jobsRes.data.data);
      setTotalJobs(jobsRes.data.total || 0);
      setRecentApplications(appsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchDashboardData();
  }, [session, jobPage]);

  const handleJobAction = async (jobId: string, action: string) => {
    try {
      if (action === 'delete') {
        await api.delete(`/api/jobs/${jobId}`);
        toast.success('Job deleted successfully');
      } else if (action === 'close') {
        await api.patch(`/api/jobs/${jobId}/close`);
        toast.success('Job closed successfully');
      }
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to perform action');
    }
  };

  const openConfirm = (action: 'delete' | 'close', job: any) => {
    setConfirmAction(action);
    setConfirmJob(job);
    setConfirmModalOpen(true);
  };

  const closeConfirm = () => {
    setConfirmModalOpen(false);
    setConfirmAction(null);
    setConfirmJob(null);
  };

  const performConfirmedAction = async () => {
    if (!confirmAction || !confirmJob) return;
    try {
      setIsPerformingAction(true);
      await handleJobAction(confirmJob._id, confirmAction);
    } finally {
      setIsPerformingAction(false);
      closeConfirm();
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const statsData = useMemo(() => [
    { 
      label: 'Active Jobs', 
      value: stats?.activeJobs || 0, 
      trend: stats?.activeJobsTrend || '+12%', 
      icon: Briefcase, 
      color: 'text-accent-primary', 
      bg: 'bg-accent-primary/10' 
    },
    { 
      label: 'Total Applications', 
      value: stats?.totalApplications || 0, 
      trend: stats?.totalApplicationsTrend || '+24%', 
      icon: Users, 
      color: 'text-accent-secondary', 
      bg: 'bg-accent-secondary/10' 
    },
    { 
      label: 'Pending Review', 
      value: stats?.pendingReview || 0, 
      trend: stats?.pendingReviewTrend || '+8%', 
      icon: Clock, 
      color: 'text-accent-warning', 
      bg: 'bg-accent-warning/10' 
    },
    { 
      label: 'Offers Extended', 
      value: stats?.offersExtended || 0, 
      trend: stats?.offersExtendedTrend || '+15%', 
      icon: CheckCircle2, 
      color: 'text-luxury', 
      bg: 'bg-luxury/10' 
    }
  ], [stats]);

  return (
    <DashboardLayout>
      <div className="space-y-10">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="screening" className="px-3 py-1 text-[10px] uppercase font-black tracking-widest bg-accent-primary/10 text-accent-primary border-none">
              Recruiter Dashboard
            </Badge>
            <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-none">
              Welcome back, <span className="text-accent-primary italic">{session?.user?.name?.split(' ')[0]}</span>.
            </h1>
            <p className="text-text-secondary font-medium tracking-tight">
              Manage your job postings and track applicant pipeline.
            </p>
          </div>
        </header>

        {/* Stats Row */}
        {!isLoading && (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {statsData.map((stat, idx) => (
              <motion.div key={idx} variants={item}>
                <Card className="hover:border-border/80 transition-colors h-full">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                        <stat.icon size={20} />
                      </div>
                      <div className="flex items-center gap-1">
                        {stat.trend.startsWith('+') ? (
                          <ArrowUpRight size={12} className="text-accent-primary" />
                        ) : (
                          <ArrowDownRight size={12} className="text-accent-danger" />
                        )}
                        <span className={`text-[10px] font-black tracking-widest ${
                          stat.trend.startsWith('+') ? 'text-accent-primary' : 'text-accent-danger'
                        }`}>
                          {stat.trend}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-3xl font-display font-black text-white font-mono">{stat.value}</div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">{stat.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-6 bg-bg-card border border-border rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/recruiter/jobs/new">
              <Button className="px-6 py-3 font-bold rounded-xl whitespace-nowrap">
                <Plus size={16} className="mr-2" />
                Post New Job
              </Button>
            </Link>
            <Link href="/recruiter/pipeline">
              <Button variant="secondary" className="px-6 py-3 font-bold rounded-xl whitespace-nowrap">
                <Eye size={16} className="mr-2" />
                View Pipeline
              </Button>
            </Link>
            <Link href="/recruiter/analytics">
              <Button variant="ghost" className="px-6 py-3 font-bold rounded-xl whitespace-nowrap">
                <BarChart3 size={16} className="mr-2" />
                View Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* My Jobs Table */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-display font-black uppercase tracking-tight text-white">My Jobs</CardTitle>
            <Link href="/recruiter/jobs">
              <Button variant="ghost" className="text-xs font-bold text-accent-primary hover:underline">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-bg-secondary animate-pulse" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-12 text-center">
                <Briefcase size={40} className="text-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No jobs posted yet</h3>
                <p className="text-sm text-text-secondary mb-4">Get started by posting your first job opening.</p>
                <Link href="/recruiter/jobs/new">
                  <Button>
                    <Plus size={16} className="mr-2" />
                    Post Your First Job
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-tertiary">Job Title</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-tertiary">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-tertiary">Applications</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-tertiary">Posted</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-tertiary">Deadline</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-tertiary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job._id} className="border-b border-border hover:bg-bg-secondary/50 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <h4 className="text-sm font-bold text-white">
                              <Link href={`/recruiter/jobs/${job._id}/applications`} className="hover:underline">
                                {job.title}
                              </Link>
                            </h4>
                            <p className="text-xs text-text-tertiary">{job.type} • {job.workMode}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${JOB_STATUSES[job.status as keyof typeof JOB_STATUSES]?.color} text-white text-[9px] px-2 py-1`}>
                            {JOB_STATUSES[job.status as keyof typeof JOB_STATUSES]?.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-text-primary">{job.applicantCount ?? job.applicationCount ?? 0}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-text-secondary">
                            {format(new Date(job.createdAt), 'MMM d, yyyy')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-text-secondary">
                            { (job.expiryDate || job.deadline) ? format(new Date(job.expiryDate || job.deadline), 'MMM d, yyyy') : 'No deadline' }
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/recruiter/jobs/${job._id}/applications`}>
                              <Button variant="ghost" size="sm" className="text-xs">
                                <Eye size={12} />
                              </Button>
                            </Link>
                            <Link href={`/recruiter/jobs/${job._id}/edit`}>
                              <Button variant="ghost" size="sm" className="text-xs">
                                <Edit size={12} />
                              </Button>
                            </Link>
                            {job.status === 'active' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs"
                                onClick={(e) => { e.stopPropagation(); openConfirm('close', job); }}
                                title="Close job"
                                aria-label="Close job"
                              >
                                <X size={12} />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs text-accent-danger"
                              onClick={(e) => { e.stopPropagation(); openConfirm('delete', job); }}
                              title="Delete job"
                              aria-label="Delete job"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination */}
                {totalJobs > 10 && (
                  <div className="flex justify-center mt-6 gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={jobPage === 1}
                      onClick={() => setJobPage(jobPage - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-text-secondary py-2 px-4">
                      Page {jobPage} of {Math.ceil(totalJobs / 10)}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={jobPage >= Math.ceil(totalJobs / 10)}
                      onClick={() => setJobPage(jobPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Confirm Action Modal */}
        <Modal
          isOpen={confirmModalOpen}
          onClose={closeConfirm}
          title={confirmAction === 'delete' ? 'Delete Job' : 'Confirm Action'}
          description={confirmJob ? `Are you sure you want to ${confirmAction === 'delete' ? 'delete' : 'close'} the job "${confirmJob.title}"? This action cannot be undone.` : ''}
          maxWidth="sm"
        >
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeConfirm} disabled={isPerformingAction}>Cancel</Button>
            <Button variant="danger" onClick={performConfirmedAction} isLoading={isPerformingAction}>
              {confirmAction === 'delete' ? 'Delete Job' : 'Close Job'}
            </Button>
          </div>
        </Modal>

        {/* Recent Applications Widget */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-display font-black uppercase tracking-tight text-white">Recent Applications</CardTitle>
            <Link href="/recruiter/pipeline">
              <Button variant="ghost" className="text-xs font-bold text-accent-primary hover:underline">
                View Pipeline
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentApplications.length === 0 ? (
              <div className="py-8 text-center">
                <Users size={40} className="text-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No recent applications</h3>
                <p className="text-sm text-text-secondary">Applications will appear here as candidates apply.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentApplications.map((application) => (
                  <div 
                    key={application._id} 
                    className="flex items-center justify-between p-4 rounded-xl bg-bg-secondary/30 border border-border hover:border-border/80 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/recruiter/pipeline?job=${application.job._id}`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar
                        initials={`${application.applicant.firstName?.[0] || ''}${application.applicant.lastName?.[0] || ''}`.toUpperCase()}
                        size="md"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          <Link href={`/recruiter/pipeline?app=${application._id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                            {application.applicant.firstName} {application.applicant.lastName}
                          </Link>
                        </h4>
                        <p className="text-xs text-text-tertiary">
                          Applied to <Link href={`/recruiter/jobs/${application.job._id}/applications`} onClick={(e) => e.stopPropagation()} className="hover:underline">{application.job.title}</Link> • {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={application.stage} className="text-[9px]">
                        {application.stage}
                      </Badge>
                      <ArrowUpRight size={16} className="text-text-tertiary" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
