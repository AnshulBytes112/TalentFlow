'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Input from '@/components/ui/Input';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Briefcase,
  Users,
  Star,
  StarOff,
  Download,
  FileText,
  MessageSquare,
  X,
  ChevronRight,
  Calendar,
  MapPin,
  Building,
  Plus,
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';
import api from '@/lib/axios';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';

const STAGES = ['applied', 'screening', 'interview', 'technical', 'offer', 'rejected', 'withdrawn'] as const;
const VALID_TRANSITIONS: Record<string, typeof STAGES[number][]> = {
  applied: ['screening', 'rejected'],
  screening: ['interview', 'rejected'],
  interview: ['technical', 'offer', 'rejected'],
  technical: ['offer', 'rejected'],
  offer: [],
  rejected: ['screening'],
  withdrawn: [],
};

interface Application {
  _id: string;
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    skills: string[];
    experience: string;
    bio?: string;
  };
  job: {
    _id: string;
    title: string;
    company?: string;
  };
  stage: typeof STAGES[number];
  appliedAt: string;
  shortlisted: boolean;
  recruiterNote?: string;
  resumeUrl?: string;
  coverLetter?: string;
}

const normalizeStage = (rawStage: string | undefined): typeof STAGES[number] => {
  const value = (rawStage || '').toLowerCase().trim();

  if (value.includes('technical')) return 'technical';
  if (value === 'initial') return 'applied';
  if (value === 'final' || value === 'completed') return 'offer';
  if (STAGES.includes(value as typeof STAGES[number])) return value as typeof STAGES[number];
  if (value.includes('interview')) return 'interview';

  return 'applied';
};

const safeExperience = (exp: any): string => {
  if (!exp) return '';
  if (typeof exp === 'string') return exp;
  if (Array.isArray(exp)) {
    const arr = exp
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
      .filter(Boolean);
    return arr.join(', ');
  }
  if (typeof exp === 'object') {
    const title = exp.title || exp.role || exp.position || '';
    const company = exp.company || '';
    return [title, company].filter(Boolean).join(' at ') || JSON.stringify(exp);
  }
  return String(exp);
};

interface SortableApplicationCardProps {
  application: Application;
  onSelect: (application: Application) => void;
  isDragging?: boolean;
}

function SortableApplicationCard({ application, onSelect, isDragging }: SortableApplicationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: application._id,
    data: {
      type: 'application',
      stage: application.stage,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <ApplicationCard application={application} onSelect={onSelect} />
    </div>
  );
}

interface PipelineColumnProps {
  stage: typeof STAGES[number];
  applications: Application[];
  activeId: string | null;
  onSelect: (application: Application) => void;
}

function PipelineColumn({ stage, applications, activeId, onSelect }: PipelineColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage,
    data: {
      type: 'stage',
      stage,
    },
  });

  return (
    <Card className="border-border min-h-[400px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-display font-black uppercase tracking-wider text-white capitalize">
            {stage}
          </CardTitle>
          <Badge variant="default" className="text-[10px] px-2 py-1 bg-accent-primary/10 text-accent-primary border-accent-primary/20">
            {applications.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <SortableContext
          items={applications.map(app => app._id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={setNodeRef} className="space-y-2 min-h-[300px] p-1">
            {applications.map(application => (
              <SortableApplicationCard
                key={application._id}
                application={application}
                onSelect={onSelect}
                isDragging={activeId === application._id}
              />
            ))}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}

function ApplicationCard({ application, onSelect }: { application: Application; onSelect: (application: Application) => void }) {
  const [isShortlisted, setIsShortlisted] = useState(application.shortlisted);
  const skills = Array.isArray(application.applicant?.skills) ? application.applicant.skills : [];

  const toggleShortlist = async () => {
    try {
      await api.patch(`/api/applications/${application._id}/shortlist`);
      setIsShortlisted(!isShortlisted);
      toast.success(isShortlisted ? 'Removed from shortlist' : 'Added to shortlist');
    } catch (error) {
      toast.error('Failed to update shortlist status');
    }
  };

  return (
    <Card
      className="mb-3 hover:border-border/80 transition-all cursor-pointer bg-bg-secondary/30"
      onClick={() => onSelect(application)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar
            initials={`${application.applicant.firstName?.[0] || ''}${application.applicant.lastName?.[0] || ''}`.toUpperCase()}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-white truncate">
                {application.applicant.firstName} {application.applicant.lastName}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleShortlist();
                }}
                className="p-1"
              >
                {isShortlisted ? (
                  <Star size={14} className="text-accent-warning fill-current" />
                ) : (
                  <StarOff size={14} className="text-text-tertiary" />
                )}
              </Button>
            </div>
            
            <p className="text-xs text-text-secondary mb-2">
              {application.applicant.experience && `${safeExperience(application.applicant.experience)} • `}
              Applied {formatDistanceToNow(new Date(application.appliedAt), { addSuffix: true })}
            </p>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {skills.slice(0, 3).map((skill, idx) => (
                <Badge key={idx} variant="default" className="text-[8px] px-2 py-0.5 bg-accent-primary/10 text-accent-primary border-accent-primary/20">
                  {skill}
                </Badge>
              ))}
              {skills.length > 3 && (
                <span className="text-[8px] text-text-tertiary">
                  +{skills.length - 3} more
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-tertiary truncate">
                {application.job.title}
              </p>
              <ChevronRight size={12} className="text-text-tertiary" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RecruiterPipelinePage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [recruiterNote, setRecruiterNote] = useState('');
  const [isUpdatingNote, setIsUpdatingNote] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchPipelineData = async () => {
    try {
      setIsLoading(true);
      const [appsRes, jobsRes] = await Promise.all([
        api.get('/api/applications/my/pipeline'),
        api.get('/api/jobs/my')
      ]);

      const normalizedApplications = (appsRes?.data?.data || []).map((app: any) => ({
        ...app,
        stage: normalizeStage(app.stage || app.status),
      }));

      setApplications(normalizedApplications);
      setJobs(jobsRes.data.data);
      const jobParam = searchParams?.get('job');
      const appParam = searchParams?.get('app');

      if (jobParam) {
        setSelectedJob(jobParam);
      }

      if (appParam) {
        const matched = normalizedApplications.find((a: any) => a._id === appParam);
        if (matched) {
          setSelectedApplication(matched);
        }
      }
    } catch (error) {
      console.error('Failed to fetch pipeline data', error);
      toast.error('Failed to load pipeline data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchPipelineData();
  }, [session]);

  useEffect(() => {
    if (selectedApplication) {
      setRecruiterNote(selectedApplication.recruiterNote || '');
    }
  }, [selectedApplication]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic if needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const application = applications.find(app => app._id === active.id);
    if (!application) return;

    const overId = over.id as string;
    const overData = over.data?.current as { type?: string; stage?: typeof STAGES[number] } | undefined;

    let newStage: typeof STAGES[number] | undefined;

    if (STAGES.includes(overId as typeof STAGES[number])) {
      newStage = overId as typeof STAGES[number];
    } else if (overData?.type === 'stage' && overData.stage) {
      newStage = overData.stage;
    } else {
      const overApplication = applications.find(app => app._id === overId);
      newStage = overApplication?.stage;
    }

    if (!newStage || newStage === application.stage) {
      return;
    }
    
    // Validate transition
    if (!VALID_TRANSITIONS[application.stage]?.includes(newStage)) {
      toast.error(`Cannot move from ${application.stage} to ${newStage}`);
      return;
    }

    try {
      // Optimistic update
      setApplications(prev => prev.map(app => 
        app._id === active.id ? { ...app, stage: newStage } : app
      ));

      // API call
      await api.patch(`/api/applications/${active.id}/stage`, { stage: newStage });
      toast.success(`Application moved to ${newStage}`);
    } catch (error) {
      // Revert on error
      setApplications(prev => prev.map(app => 
        app._id === active.id ? { ...app, stage: application.stage } : app
      ));
      const errorMessage = (error as any)?.response?.data?.message || 'Failed to update application stage';
      toast.error(errorMessage);
    }
  };

  const updateRecruiterNote = async () => {
    if (!selectedApplication) return;

    try {
      setIsUpdatingNote(true);
      await api.patch(`/api/applications/${selectedApplication._id}/note`, {
        note: recruiterNote
      });
      
      setApplications(prev => prev.map(app => 
        app._id === selectedApplication._id 
          ? { ...app, recruiterNote: recruiterNote }
          : app
      ));
      
      setSelectedApplication(prev => prev ? { ...prev, recruiterNote } : null);
      toast.success('Note updated successfully');
    } catch (error) {
      toast.error('Failed to update note');
    } finally {
      setIsUpdatingNote(false);
    }
  };

  const updateApplicationStage = async (newStage: typeof STAGES[number]) => {
    if (!selectedApplication) return;

    try {
      await api.patch(`/api/applications/${selectedApplication._id}/stage`, { stage: newStage });
      
      setApplications(prev => prev.map(app => 
        app._id === selectedApplication._id 
          ? { ...app, stage: newStage }
          : app
      ));
      
      setSelectedApplication(prev => prev ? { ...prev, stage: newStage } : null);
      toast.success(`Application moved to ${newStage}`);
    } catch (error) {
      const errorMessage = (error as any)?.response?.data?.message || 'Failed to update stage';
      toast.error(errorMessage);
    }
  };

  const applicationsByStage = applications.reduce((acc, app) => {
    if (selectedJob !== 'all' && app.job._id !== selectedJob) {
      return acc;
    }
    const normalizedStage = normalizeStage(app.stage);
    acc[normalizedStage] = [...(acc[normalizedStage] || []), { ...app, stage: normalizedStage }];
    return acc;
  }, {} as Record<typeof STAGES[number], Application[]>);

  const activeApplication = applications.find(app => app._id === activeId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="screening" className="px-3 py-1 text-[10px] uppercase font-black tracking-widest bg-accent-primary/10 text-accent-primary border-none">
              Application Pipeline
            </Badge>
            <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-none">
              Candidate Pipeline
            </h1>
            <p className="text-text-secondary font-medium tracking-tight">
              Track and manage applications through the hiring process.
            </p>
          </div>
        </header>

        {/* Job Filter */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-bg-card border border-border rounded-xl">
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-white">Filter by Job:</label>
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="px-4 py-2 bg-bg-secondary border border-border rounded-xl text-white focus:ring-2 focus:ring-accent-primary focus:border-transparent font-medium"
            >
              <option value="all">All Jobs</option>
              {jobs.map(job => (
                <option key={job._id} value={job._id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-text-secondary">
            {applications.length} total applications
          </div>
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {STAGES.map(stage => (
              <PipelineColumn
                key={stage}
                stage={stage}
                applications={applicationsByStage[stage] || []}
                activeId={activeId}
                onSelect={setSelectedApplication}
              />
            ))}
          </div>

          <DragOverlay>
            {activeApplication ? (
              <div className="rotate-3 opacity-80">
                <ApplicationCard application={activeApplication} onSelect={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Application Detail Drawer */}
        <AnimatePresence>
          {selectedApplication && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              className="fixed right-0 top-0 h-full w-full md:w-96 bg-bg-card border-l border-border shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Application Details</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedApplication(null)}
                  >
                    <X size={20} />
                  </Button>
                </div>

                {/* Applicant Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar
                      initials={`${selectedApplication.applicant.firstName?.[0] || ''}${selectedApplication.applicant.lastName?.[0] || ''}`.toUpperCase()}
                      size="lg"
                    />
                    <div>
                      <h4 className="text-lg font-bold text-white">
                        {selectedApplication.applicant.firstName} {selectedApplication.applicant.lastName}
                      </h4>
                      <p className="text-sm text-text-secondary">
                        {selectedApplication.applicant.email}
                      </p>
                      {selectedApplication.applicant.phone && (
                        <p className="text-sm text-text-secondary">
                          {selectedApplication.applicant.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-bold text-white mb-2">Experience</h5>
                    <p className="text-sm text-text-secondary">
                      {safeExperience(selectedApplication.applicant.experience)}
                    </p>
                  </div>

                  {selectedApplication.applicant.bio && (
                    <div>
                      <h5 className="text-sm font-bold text-white mb-2">Bio</h5>
                      <p className="text-sm text-text-secondary">
                        {selectedApplication.applicant.bio}
                      </p>
                    </div>
                  )}

                  <div>
                    <h5 className="text-sm font-bold text-white mb-2">Skills</h5>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(selectedApplication.applicant.skills) ? selectedApplication.applicant.skills : []).map((skill, idx) => (
                        <Badge key={idx} variant="default" className="bg-accent-primary/10 text-accent-primary border-accent-primary/20">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-bold text-white mb-2">Applied to</h5>
                    <p className="text-sm text-text-secondary">
                      {selectedApplication.job.title}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-sm font-bold text-white mb-2">Applied</h5>
                    <p className="text-sm text-text-secondary">
                      {format(new Date(selectedApplication.appliedAt), 'MMMM d, yyyy')}
                    </p>
                  </div>

                  {/* Documents */}
                  <div className="space-y-3">
                    {selectedApplication.resumeUrl && (
                      <Button variant="secondary" className="w-full justify-start">
                        <Download size={16} className="mr-2" />
                        Download Resume
                      </Button>
                    )}
                    {selectedApplication.coverLetter && (
                      <Button variant="secondary" className="w-full justify-start">
                        <FileText size={16} className="mr-2" />
                        View Cover Letter
                      </Button>
                    )}
                  </div>

                  {/* Stage History */}
                  <div>
                    <h5 className="text-sm font-bold text-white mb-2">Current Stage</h5>
                    <Badge variant={selectedApplication.stage} className="capitalize">
                      {selectedApplication.stage}
                    </Badge>
                  </div>

                  {/* Recruiter Note */}
                  <div>
                    <h5 className="text-sm font-bold text-white mb-2">Recruiter Note</h5>
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-vertical text-sm"
                      placeholder="Add notes about this candidate..."
                      value={recruiterNote}
                      onChange={(e) => setRecruiterNote(e.target.value)}
                    />
                    <Button
                      onClick={updateRecruiterNote}
                      disabled={isUpdatingNote}
                      className="mt-2 w-full"
                      size="sm"
                    >
                      {isUpdatingNote ? 'Saving...' : 'Save Note'}
                    </Button>
                  </div>

                  {/* Stage Actions */}
                  <div>
                    <h5 className="text-sm font-bold text-white mb-3">Update Stage</h5>
                    <div className="space-y-2">
                      {VALID_TRANSITIONS[selectedApplication.stage]?.map(nextStage => (
                        <Button
                          key={nextStage}
                          onClick={() => updateApplicationStage(nextStage)}
                          variant="secondary"
                          className="w-full justify-start capitalize"
                        >
                          <ArrowRight size={16} className="mr-2" />
                          Move to {nextStage}
                        </Button>
                      ))}
                      <Button
                        onClick={() => updateApplicationStage('rejected')}
                        variant="secondary"
                        className="w-full justify-start text-accent-danger"
                      >
                        <X size={16} className="mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlay for drawer */}
        {selectedApplication && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedApplication(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
