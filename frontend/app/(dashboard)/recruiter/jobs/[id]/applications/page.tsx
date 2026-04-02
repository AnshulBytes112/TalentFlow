'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, ExternalLink, Mail, Phone, User } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import api from '@/lib/axios';

type Application = {
  _id: string;
  status?: string;
  stage?: string;
  createdAt: string;
  coverLetter?: string;
  resume?: { url?: string; originalName?: string };
  applicant: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    profile?: {
      phone?: string;
      experience?: string;
      skills?: string[];
      resumeUrl?: string;
    };
  };
};

const STAGE_BADGE_VARIANT = (value: string) => {
  const v = value?.toLowerCase?.() || 'default';
  if (v === 'applied' || v === 'initial') return 'applied';
  if (v === 'screening') return 'screening';
  if (v === 'interview') return 'interview';
  if (v === 'technical') return 'technical';
  if (v === 'offer' || v === 'final') return 'offer';
  if (v === 'rejected' || v === 'completed') return 'rejected';
  return 'default';
};

const resolveResumeUrl = (value?: string) => {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  if (/^file:\/\//i.test(trimmed)) {
    const normalizedPath = trimmed.replace(/^file:\/+/i, '').replace(/\\/g, '/');
    const fileName = normalizedPath.split('/').pop();
    return fileName ? `${apiBase}/uploads/${fileName}` : '';
  }

  if (trimmed.startsWith('/uploads/')) {
    return `${apiBase}${trimmed}`;
  }

  const normalized = trimmed.replace(/\\/g, '/');
  if (normalized.includes('/uploads/')) {
    const fileName = normalized.split('/').pop();
    return fileName ? `${apiBase}/uploads/${fileName}` : '';
  }

  return trimmed;
};

const safeExperience = (exp: any): string => {
  if (!exp) return '';
  if (typeof exp === 'string') return exp;
  if (Array.isArray(exp)) {
    return exp
      .map((e: any) => {
        if (!e) return '';
        if (typeof e === 'string') return e;
        if (typeof e === 'object') {
          const title = e.title || e.role || e.position || '';
          const company = e.company || '';
          return [title, company].filter(Boolean).join(' at ');
        }
        return String(e);
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof exp === 'object') {
    const title = exp.title || exp.role || exp.position || '';
    const company = exp.company || '';
    return [title, company].filter(Boolean).join(' at ') || JSON.stringify(exp);
  }
  return String(exp);
};

export default function RecruiterJobApplicationsPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const fetchApplications = async () => {
    if (!jobId) return;

    try {
      setIsLoading(true);
      const res = await api.get(`/api/applications/jobs/${jobId}/applications?limit=100`);
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      setApplications(list);
      if (list.length > 0) {
        setSelected(list[0]);
      } else {
        setSelected(null);
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to load job applications';
      toast.error(message);
      setApplications([]);
      setSelected(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [jobId]);

  const selectedStatus = useMemo(() => {
    if (!selected) return '';
    return selected.status || selected.stage || 'applied';
  }, [selected]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-black text-white">Job Applicants</h1>
            <p className="text-text-secondary text-sm">View and review candidates for this job.</p>
          </div>
          <Link href="/recruiter">
            <Button variant="secondary" className="whitespace-nowrap">
              <ArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Applicants ({applications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-bg-secondary animate-pulse" />
                  ))}
                </div>
              ) : applications.length === 0 ? (
                <p className="text-text-secondary">No applications found for this job yet.</p>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => {
                    const status = app.status || app.stage || 'applied';
                    const fullName = `${app.applicant?.firstName || ''} ${app.applicant?.lastName || ''}`.trim() || 'Unknown Candidate';
                    return (
                      <button
                        key={app._id}
                        type="button"
                        onClick={() => {
                          setSelected(app);
                          setIsProfileModalOpen(true);
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition ${
                          selected?._id === app._id
                            ? 'border-accent-primary bg-accent-primary/5'
                            : 'border-border bg-bg-secondary/40 hover:border-border/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              initials={`${app.applicant?.firstName?.[0] || ''}${app.applicant?.lastName?.[0] || ''}`.toUpperCase()}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">{fullName}</p>
                              <p className="text-xs text-text-secondary truncate">{app.applicant?.email || 'No email'}</p>
                            </div>
                          </div>
                          <Badge variant={STAGE_BADGE_VARIANT(status) as any} className="capitalize">
                            {status}
                          </Badge>
                        </div>
                        <p className="text-xs text-text-tertiary mt-2">
                          Applied {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-white">Applicant Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="text-text-secondary text-sm">Select an applicant to view details.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      initials={`${selected.applicant?.firstName?.[0] || ''}${selected.applicant?.lastName?.[0] || ''}`.toUpperCase()}
                      size="md"
                    />
                    <div>
                      <p className="font-bold text-white">
                        {`${selected.applicant?.firstName || ''} ${selected.applicant?.lastName || ''}`.trim() || 'Unknown Candidate'}
                      </p>
                      <Badge variant={STAGE_BADGE_VARIANT(selectedStatus) as any} className="capitalize mt-1">
                        {selectedStatus}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Mail size={14} />
                      <span>{selected.applicant?.email || 'No email'}</span>
                    </div>
                    {selected.applicant?.profile?.phone && (
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Phone size={14} />
                        <span>{selected.applicant.profile.phone}</span>
                      </div>
                    )}
                    {selected.applicant?.profile?.experience && (
                      <div className="flex items-center gap-2 text-text-secondary">
                        <User size={14} />
                        <span>{safeExperience(selected.applicant.profile.experience)}</span>
                      </div>
                    )}
                  </div>

                  {!!selected.applicant?.profile?.skills?.length && (
                    <div>
                      <p className="text-sm font-bold text-white mb-2">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {selected.applicant.profile.skills.map((skill, idx) => (
                          <Badge key={`${skill}-${idx}`} variant="default" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.coverLetter && (
                    <div>
                      <p className="text-sm font-bold text-white mb-2">Cover Letter</p>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{selected.coverLetter}</p>
                    </div>
                  )}

                  {resolveResumeUrl(selected.resume?.url || selected.applicant?.profile?.resumeUrl) && (
                    <a
                      href={resolveResumeUrl(selected.resume?.url || selected.applicant?.profile?.resumeUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex"
                    >
                      <Button variant="secondary" className="w-full">
                        <ExternalLink size={16} className="mr-2" />
                        Open Resume
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Modal
          isOpen={isProfileModalOpen && Boolean(selected)}
          onClose={() => setIsProfileModalOpen(false)}
          title="Applicant Profile"
          description="Review candidate information and resume"
          maxWidth="lg"
        >
          {!selected ? null : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar
                  initials={`${selected.applicant?.firstName?.[0] || ''}${selected.applicant?.lastName?.[0] || ''}`.toUpperCase()}
                  size="md"
                />
                <div>
                  <p className="font-bold text-white">
                    {`${selected.applicant?.firstName || ''} ${selected.applicant?.lastName || ''}`.trim() || 'Unknown Candidate'}
                  </p>
                  <Badge variant={STAGE_BADGE_VARIANT(selectedStatus) as any} className="capitalize mt-1">
                    {selectedStatus}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Mail size={14} />
                  <span>{selected.applicant?.email || 'No email'}</span>
                </div>
                {selected.applicant?.profile?.phone && (
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Phone size={14} />
                    <span>{selected.applicant.profile.phone}</span>
                  </div>
                )}
                {selected.applicant?.profile?.experience && (
                  <div className="flex items-center gap-2 text-text-secondary">
                    <User size={14} />
                    <span>{safeExperience(selected.applicant.profile.experience)}</span>
                  </div>
                )}
              </div>

              {!!selected.applicant?.profile?.skills?.length && (
                <div>
                  <p className="text-sm font-bold text-white mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.applicant.profile.skills.map((skill, idx) => (
                      <Badge key={`${skill}-${idx}`} variant="default" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selected.coverLetter && (
                <div>
                  <p className="text-sm font-bold text-white mb-2">Cover Letter</p>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">{selected.coverLetter}</p>
                </div>
              )}

              {resolveResumeUrl(selected.resume?.url || selected.applicant?.profile?.resumeUrl) && (
                <a
                  href={resolveResumeUrl(selected.resume?.url || selected.applicant?.profile?.resumeUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button variant="secondary" className="w-full">
                    <ExternalLink size={16} className="mr-2" />
                    Open Resume
                  </Button>
                </a>
              )}
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
