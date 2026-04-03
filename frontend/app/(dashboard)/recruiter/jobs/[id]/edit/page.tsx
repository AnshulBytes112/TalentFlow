'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import api from '@/lib/axios';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  CheckCircle2,
  Save
} from 'lucide-react';
import { format, addDays, isAfter } from 'date-fns';
import { toast } from 'react-hot-toast';

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];
const WORK_MODES = ['onsite', 'remote', 'hybrid'];
const JOB_CATEGORIES = [
  'engineering',
  'design',
  'marketing',
  'sales',
  'customer-support',
  'product',
  'data-science',
  'hr',
  'finance',
  'operations',
  'other'
];
const EXPERIENCE_LEVELS = ['entry-level', 'mid-level', 'senior-level', 'executive'];

interface JobFormData {
  title: string;
  type: string;
  workMode: string;
  location: string;
  companyName: string;
  category: string;
  experience: string;
  description: string;
  requirements: string[];
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  deadline?: string;
  isUnpaid?: boolean;
  status: 'draft' | 'active' | 'closed' | 'expired';
}

const initialFormData: JobFormData = {
  title: '',
  type: '',
  workMode: '',
  location: '',
  companyName: '',
  category: '',
  experience: '',
  description: '',
  requirements: [],
  skills: [],
  salaryMin: undefined,
  salaryMax: undefined,
  currency: 'USD',
  isUnpaid: false,
  deadline: '',
  status: 'draft'
};

export default function JobEditPage() {
  const { data: session } = useSession();
  const params: any = useParams();
  const jobId = params?.id;
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    const fetchJob = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/api/jobs/${jobId}`);
        const job = res.data?.data || res.data || {};

        setFormData({
          title: job.title || '',
          type: job.type || job.jobType || '',
          workMode: job.workMode || job.mode || '',
          location: job.location || '',
          companyName: job.companyName || job.company || '',
          category: job.category || '',
          experience: job.experience || '',
          description: job.description || '',
          requirements: Array.isArray(job.requirements) ? job.requirements : (job.requirements || []).filter(Boolean),
          skills: Array.isArray(job.skills) ? job.skills : (job.skills || []).filter(Boolean),
          salaryMin: job.salaryMin ?? job.salary?.min ?? undefined,
          salaryMax: job.salaryMax ?? job.salary?.max ?? undefined,
          currency: job.currency || (job.salary && job.salary.currency) || 'USD',
          isUnpaid: !!job.isUnpaid,
          deadline: job.expiryDate ? format(new Date(job.expiryDate), 'yyyy-MM-dd') : (job.deadline ? format(new Date(job.deadline), 'yyyy-MM-dd') : ''),
          status: job.status || 'draft'
        });
      } catch (error) {
        toast.error('Failed to load job data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const saveChanges = async (statusOverride?: JobFormData['status']) => {
    if (!jobId) return;
    try {
      setIsSaving(true);
      const payload: any = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        skills: formData.skills,
        location: formData.location,
        type: formData.type,
        jobType: formData.type,
        workMode: formData.workMode,
        isUnpaid: !!formData.isUnpaid,
        ...(formData.isUnpaid ? {} : { salaryMin: formData.salaryMin, salaryMax: formData.salaryMax, currency: formData.currency }),
        deadline: formData.deadline || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        companyName: formData.companyName,
        category: formData.category,
        experience: formData.experience,
        status: statusOverride || formData.status
      };

      // Basic validations
      if (!payload.title || !payload.type || !payload.workMode || !payload.location) {
        setErrors({ submit: 'Please fill required basic fields' });
        setIsSaving(false);
        return;
      }

      await api.put(`/api/jobs/${jobId}`, payload);
      toast.success('Job updated successfully');
      router.push('/recruiter/jobs');
    } catch (error: any) {
      const fieldError = error.response?.data?.errors?.[0]?.message;
      const message = fieldError || error.response?.data?.message || 'Failed to update job';
      toast.error(message);
      setErrors({ submit: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof JobFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      handleInputChange('skills', [...formData.skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    handleInputChange('skills', formData.skills.filter(s => s !== skill));
  };

  const handleAddRequirement = () => {
    if (requirementInput.trim() && !formData.requirements.includes(requirementInput.trim())) {
      handleInputChange('requirements', [...formData.requirements, requirementInput.trim()]);
      setRequirementInput('');
    }
  };

  const handleRemoveRequirement = (req: string) => {
    handleInputChange('requirements', formData.requirements.filter(r => r !== req));
  };

  const saveDraft = () => saveChanges('draft');
  const publishJob = () => saveChanges('active');
  const closeJob = () => saveChanges('closed');

  if (!session) return null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-black text-white">Edit Job</h1>
            <p className="text-text-secondary">Update job details and status</p>
          </div>
        </header>

        {isLoading ? (
          <Card className="p-8">
            <CardContent>Loading job...</CardContent>
          </Card>
        ) : (
          <>
            {/* Error Display */}
            {Object.values(errors).some(Boolean) && (
              <Card className="bg-accent-danger/10 border-accent-danger/20">
                <CardContent className="p-4">
                  <p className="text-accent-danger text-sm font-medium">{Object.values(errors).find(e => e)}</p>
                </CardContent>
              </Card>
            )}

            <Card className="border-border">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">Job Title *</label>
                    <Input
                      label="Job Title"
                      placeholder="e.g. Senior Full Stack Developer"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="bg-bg-secondary"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">Company Name</label>
                      <Input label="Company" value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} className="bg-bg-secondary" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">Location</label>
                      <Input label="Location" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} className="bg-bg-secondary" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">Job Type</label>
                      <select value={formData.type} onChange={(e) => handleInputChange('type', e.target.value)} className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white focus:ring-2 focus:ring-accent-primary focus:border-transparent font-medium">
                        <option value="">Select type</option>
                        {JOB_TYPES.map(t => <option key={t} value={t}>{t.replace('-', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">Work Mode</label>
                      <select value={formData.workMode} onChange={(e) => handleInputChange('workMode', e.target.value)} className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white focus:ring-2 focus:ring-accent-primary focus:border-transparent font-medium">
                        <option value="">Select mode</option>
                        {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">Experience Level</label>
                      <select value={formData.experience} onChange={(e) => handleInputChange('experience', e.target.value)} className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white focus:ring-2 focus:ring-accent-primary focus:border-transparent font-medium">
                        <option value="">Select level</option>
                        {EXPERIENCE_LEVELS.map(l => <option key={l} value={l}>{l.replace('-', ' ')}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white mb-2">Job Description</label>
                    <textarea rows={6} className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-vertical font-medium" value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white mb-3">Requirements</label>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input label="Add Requirement" placeholder="e.g. 5+ years of experience" value={requirementInput} onChange={(e) => setRequirementInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddRequirement()} className="bg-bg-secondary flex-1" />
                        <Button onClick={handleAddRequirement} className="px-3"><Plus size={16} /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.requirements.map((req, idx) => (
                          <Badge key={idx} variant="default" className="px-3 py-1 text-sm bg-bg-secondary border-border flex items-center gap-2">
                            {req}
                            <button onClick={() => handleRemoveRequirement(req)}><X size={12} /></button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white mb-3">Skills</label>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input label="Add Skill" placeholder="e.g. React" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()} className="bg-bg-secondary flex-1" />
                        <Button onClick={handleAddSkill} className="px-3"><Plus size={16} /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.map((skill, idx) => (
                          <Badge key={idx} variant="default" className="px-3 py-1 text-sm bg-accent-primary/10 text-accent-primary border-accent-primary/20 flex items-center gap-2">
                            {skill}
                            <button onClick={() => handleRemoveSkill(skill)}><X size={12} /></button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <label className="inline-flex items-center gap-2 text-sm text-white mb-2">
                        <input
                          type="checkbox"
                          checked={!!formData.isUnpaid}
                          onChange={(e) => handleInputChange('isUnpaid', e.target.checked)}
                          className="form-checkbox h-4 w-4 text-accent-primary bg-bg-secondary border-border rounded"
                        />
                        <span>Unpaid (No salary specified)</span>
                      </label>
                    </div>
                    <div>
                      {!formData.isUnpaid && (
                        <>
                          <label className="block text-sm font-bold text-white mb-2">Min Salary</label>
                          <Input label="Min Salary" type="number" value={formData.salaryMin || ''} onChange={(e) => handleInputChange('salaryMin', e.target.value ? parseInt(e.target.value) : undefined)} className="bg-bg-secondary" />
                        </>
                      )}
                    </div>
                    <div>
                      {!formData.isUnpaid && (
                        <>
                          <label className="block text-sm font-bold text-white mb-2">Max Salary</label>
                          <Input label="Max Salary" type="number" value={formData.salaryMax || ''} onChange={(e) => handleInputChange('salaryMax', e.target.value ? parseInt(e.target.value) : undefined)} className="bg-bg-secondary" />
                        </>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">Currency</label>
                      <select value={formData.currency} onChange={(e) => handleInputChange('currency', e.target.value)} className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white focus:ring-2 focus:ring-accent-primary focus:border-transparent font-medium">
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="INR">INR</option>
                        <option value="CAD">CAD</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white mb-2">Application Deadline</label>
                    <Input label="Deadline" type="date" value={formData.deadline || ''} onChange={(e) => handleInputChange('deadline', e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} className="bg-bg-secondary" />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-sm font-bold text-white">Status</label>
                    <select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value as any)} className="px-4 py-2 bg-bg-secondary border border-border rounded-xl text-white">
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>

                  <div className="flex gap-4 justify-center mt-6">
                    <Button variant="secondary" onClick={saveDraft} disabled={isSaving} className="px-8"><Save size={16} className="mr-2"/> Save Draft</Button>
                    <Button onClick={publishJob} disabled={isSaving} className="px-8"><CheckCircle2 size={16} className="mr-2"/> Publish</Button>
                    <Button variant="danger" onClick={closeJob} disabled={isSaving} className="px-8">Close Job</Button>
                    <Button variant="ghost" onClick={() => saveChanges(formData.status)} disabled={isSaving} className="px-8">Save Changes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
