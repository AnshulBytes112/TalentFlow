'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import api from '@/lib/axios';
import { 
  Briefcase, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  X,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Eye,
  Save,
  CheckCircle2
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
  // Step 1: Basic Info
  title: string;
  type: string;
  workMode: string;
  location: string;
  companyName: string;
  category: string;
  experience: string;
  
  // Step 2: Details
  description: string;
  requirements: string[];
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  deadline?: string;
  isUnpaid?: boolean;
  
  // Metadata
  status: 'draft' | 'active';
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
  deadline: '',
  isUnpaid: false,
  status: 'draft'
};

export default function JobCreationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-save draft on step change
  const saveDraft = async (status: 'draft' | 'active' = 'draft') => {
    try {
      setIsSaving(true);
      const jobData = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        skills: formData.skills,
        location: formData.location,
        jobType: formData.type,
        workMode: formData.workMode,
        isUnpaid: !!formData.isUnpaid,
        // only include salary when not unpaid
        ...(formData.isUnpaid ? {} : { salaryMin: formData.salaryMin, salaryMax: formData.salaryMax, currency: formData.currency }),
        deadline: formData.deadline || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        companyName: formData.companyName,
        category: formData.category,
        experience: formData.experience,
        status
      };
      
      // Validate required fields
      if (!jobData.title || !jobData.jobType || !jobData.workMode || !jobData.location) {
        setErrors({ title: 'Please fill in all required fields' });
        return;
      }

      if (!jobData.description || jobData.requirements.length === 0 || jobData.skills.length === 0) {
        setErrors({ step2: 'Please complete all job details before saving' });
        return;
      }

      if (!jobData.companyName || !jobData.category || !jobData.experience) {
        setErrors({ step1: 'Company, category, and experience are required' });
        return;
      }

      const response = await api.post('/api/jobs', jobData);
      toast.success(status === 'draft' ? 'Draft saved successfully' : 'Job posted successfully!');
      
      if (status === 'active') {
        router.push('/recruiter');
      } else {
        setErrors({});
      }
    } catch (error: any) {
      const fieldError = error.response?.data?.errors?.[0]?.message;
      const message = fieldError || error.response?.data?.message || 'Failed to save job';
      toast.error(message);
      setErrors({ submit: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!formData.title || !formData.type || !formData.workMode || !formData.location || !formData.companyName || !formData.category || !formData.experience) {
        setErrors({ step1: 'Please fill in all required fields' });
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.description || formData.requirements.length === 0 || formData.skills.length === 0) {
        setErrors({ step2: 'Please fill in all required fields' });
        return;
      }
      if (formData.deadline && !isAfter(new Date(formData.deadline), new Date())) {
        setErrors({ step2: 'Deadline must be in the future' });
        return;
      }
    }
    
    setErrors({});
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setErrors({});
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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

  const handleRemoveRequirement = (requirement: string) => {
    handleInputChange('requirements', formData.requirements.filter(r => r !== requirement));
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              currentStep >= step
                ? 'bg-accent-primary text-bg-primary'
                : 'bg-bg-secondary border border-border text-text-tertiary'
            }`}
          >
            {currentStep > step ? <CheckCircle2 size={16} /> : step}
          </div>
          {step < 3 && (
            <div
              className={`w-16 h-1 mx-2 transition-all ${
                currentStep > step ? 'bg-accent-primary' : 'bg-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
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

      <div>
        <label className="block text-sm font-bold text-white mb-3">Job Type *</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {JOB_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => handleInputChange('type', type)}
              className={`px-4 py-3 rounded-xl border font-medium capitalize transition-all ${
                formData.type === type
                  ? 'bg-accent-primary text-bg-primary border-accent-primary'
                  : 'bg-bg-secondary border-border text-text-secondary hover:border-accent-primary/50'
              }`}
            >
              {type.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-3">Work Mode *</label>
        <div className="grid grid-cols-3 gap-3">
          {WORK_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => handleInputChange('workMode', mode)}
              className={`px-4 py-3 rounded-xl border font-medium capitalize transition-all ${
                formData.workMode === mode
                  ? 'bg-accent-primary text-bg-primary border-accent-primary'
                  : 'bg-bg-secondary border-border text-text-secondary hover:border-accent-primary/50'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-2">Location *</label>
        <Input
          label="Location"
          placeholder="e.g. San Francisco, CA"
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          className="bg-bg-secondary"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-2">Company Name *</label>
        <Input
          label="Company Name"
          placeholder="e.g. JobMatrix Inc"
          value={formData.companyName}
          onChange={(e) => handleInputChange('companyName', e.target.value)}
          className="bg-bg-secondary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-white mb-2">Category *</label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white focus:ring-2 focus:ring-accent-primary focus:border-transparent font-medium"
          >
            <option value="">Select category</option>
            {JOB_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category.replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-white mb-2">Experience Level *</label>
          <select
            value={formData.experience}
            onChange={(e) => handleInputChange('experience', e.target.value)}
            className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white focus:ring-2 focus:ring-accent-primary focus:border-transparent font-medium"
          >
            <option value="">Select level</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level.replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Job Description * ({formData.description.length}/2000 characters)
        </label>
        <textarea
          rows={6}
          className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-vertical font-medium"
          placeholder="Describe the role, responsibilities, and what you're looking for..."
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value.slice(0, 2000))}
          maxLength={2000}
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-3">Requirements *</label>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              label="Add Requirement"
              placeholder="e.g. 5+ years of experience"
              value={requirementInput}
              onChange={(e) => setRequirementInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRequirement()}
              className="bg-bg-secondary flex-1"
            />
            <Button onClick={handleAddRequirement} className="px-3">
              <Plus size={16} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.requirements.map((req, idx) => (
              <Badge
                key={idx}
                variant="default"
                className="px-3 py-1 text-sm bg-bg-secondary border-border flex items-center gap-2"
              >
                {req}
                <button onClick={() => handleRemoveRequirement(req)}>
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-3">Skills *</label>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              label="Add Skill"
              placeholder="e.g. React, Node.js, TypeScript"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
              className="bg-bg-secondary flex-1"
            />
            <Button onClick={handleAddSkill} className="px-3">
              <Plus size={16} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.skills.map((skill, idx) => (
              <Badge
                key={idx}
                variant="default"
                className="px-3 py-1 text-sm bg-accent-primary/10 text-accent-primary border-accent-primary/20 flex items-center gap-2"
              >
                {skill}
                <button onClick={() => handleRemoveSkill(skill)}>
                  <X size={12} />
                </button>
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
              <Input
                label="Min Salary"
                type="number"
                placeholder="50000"
                value={formData.salaryMin || ''}
                onChange={(e) => handleInputChange('salaryMin', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-bg-secondary"
              />
            </>
          )}
        </div>
        <div>
          {!formData.isUnpaid && (
            <>
              <label className="block text-sm font-bold text-white mb-2">Max Salary</label>
              <Input
                label="Max Salary"
                type="number"
                placeholder="100000"
                value={formData.salaryMax || ''}
                onChange={(e) => handleInputChange('salaryMax', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-bg-secondary"
              />
            </>
          )}
        </div>
        <div>
          <label className="block text-sm font-bold text-white mb-2">Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white focus:ring-2 focus:ring-accent-primary focus:border-transparent font-medium"
          >
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
        <Input
          label="Deadline"
          type="date"
          value={formData.deadline || ''}
          onChange={(e) => handleInputChange('deadline', e.target.value)}
          min={format(new Date(), 'yyyy-MM-dd')}
          className="bg-bg-secondary"
        />
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Review & Publish</h3>
        <p className="text-text-secondary">Review your job posting before publishing</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="ghost" onClick={() => setCurrentStep(2)} className="px-5">
          <ArrowLeft size={16} className="mr-2" />
          Back to Details
        </Button>
        <Button variant="secondary" onClick={() => setCurrentStep(1)} className="px-5">
          Edit Basic Info
        </Button>
        <Button variant="secondary" onClick={() => setCurrentStep(2)} className="px-5">
          Edit Job Details
        </Button>
      </div>

      <Card className="bg-bg-secondary/50 border-border">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <h4 className="text-lg font-bold text-white">{formData.title || 'Job Title'}</h4>
                <Button variant="ghost" onClick={() => setCurrentStep(1)} className="px-3 py-1 h-auto text-sm">
                  Edit
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="default" className="capitalize">
                  {formData.type || 'Job Type'}
                </Badge>
                <Badge variant="default" className="capitalize">
                  {formData.workMode ? formData.workMode.replace('onsite', 'on-site') : 'Work Mode'}
                </Badge>
                <Badge variant="default">
                  {formData.location || 'Location'}
                </Badge>
              </div>
            </div>

            <div>
              <h5 className="text-sm font-bold text-white mb-2">Company & Role Context</h5>
              <p className="text-text-secondary text-sm">
                {formData.companyName || 'Company not provided'}
              </p>
              <p className="text-text-secondary text-sm capitalize">
                {(formData.category || 'category not provided').replace('-', ' ')} | {(formData.experience || 'experience not provided').replace('-', ' ')}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <h5 className="text-sm font-bold text-white">Description</h5>
                <Button variant="ghost" onClick={() => setCurrentStep(2)} className="px-3 py-1 h-auto text-sm">
                  Edit
                </Button>
              </div>
              <p className="text-text-secondary text-sm">
                {formData.description || 'No description provided'}
              </p>
            </div>

            {formData.requirements.length > 0 && (
              <div>
                <h5 className="text-sm font-bold text-white mb-2">Requirements</h5>
                <ul className="list-disc list-inside text-text-secondary text-sm space-y-1">
                  {formData.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {formData.skills.length > 0 && (
              <div>
                <h5 className="text-sm font-bold text-white mb-2">Skills</h5>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, idx) => (
                    <Badge key={idx} variant="default" className="bg-accent-primary/10 text-accent-primary border-accent-primary/20">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {formData.isUnpaid ? (
              <div>
                <h5 className="text-sm font-bold text-white mb-2">Salary</h5>
                <p className="text-text-secondary text-sm">Unpaid</p>
              </div>
            ) : (formData.salaryMin || formData.salaryMax) && (
              <div>
                <h5 className="text-sm font-bold text-white mb-2">Salary</h5>
                <p className="text-text-secondary text-sm">
                  {formData.salaryMin && `$${formData.salaryMin.toLocaleString()}`}
                  {formData.salaryMin && formData.salaryMax && ' - '}
                  {formData.salaryMax && `$${formData.salaryMax.toLocaleString()}`}
                  {formData.currency && ` ${formData.currency}`}
                </p>
              </div>
            )}

            {formData.deadline && (
              <div>
                <h5 className="text-sm font-bold text-white mb-2">Application Deadline</h5>
                <p className="text-text-secondary text-sm">
                  {format(new Date(formData.deadline), 'MMMM d, yyyy')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-center">
        <Button
          variant="secondary"
          onClick={() => saveDraft('draft')}
          disabled={isSaving}
          className="px-8"
        >
          <Save size={16} className="mr-2" />
          Save as Draft
        </Button>
        <Button
          onClick={() => saveDraft('active')}
          disabled={isSaving}
          className="px-8"
        >
          <CheckCircle2 size={16} className="mr-2" />
          Publish Now
        </Button>
      </div>
    </motion.div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-black text-white">Create New Job</h1>
            <p className="text-text-secondary">Post a new job opening to attract qualified candidates</p>
          </div>
        </header>

        {/* Progress Indicator */}
        {renderStepIndicator()}

        {/* Error Display */}
        {Object.values(errors).some(error => error) && (
          <Card className="bg-accent-danger/10 border-accent-danger/20">
            <CardContent className="p-4">
              <p className="text-accent-danger text-sm font-medium">
                {Object.values(errors).find(error => error)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Form Steps */}
        <Card className="border-border">
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation */}
        {currentStep < 3 && (
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6"
            >
              <ArrowLeft size={16} className="mr-2" />
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={isSaving}
              className="px-6"
            >
              {currentStep === 2 ? 'Review' : 'Next'}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
