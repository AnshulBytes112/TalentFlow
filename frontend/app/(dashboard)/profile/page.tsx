'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/axios';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,  
} from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import {
  User,
  Upload,
  FileText,
  Briefcase,
  GraduationCap,
  MapPin,
  Phone,
  Globe,
  CheckCircle2,
  Edit3,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = {
  JOBSEEKER: 'jobseeker',
  RECRUITER: 'recruiter',
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({ skills: [], experience: [], education: [] });
  const [skillDraft, setSkillDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadModal, setUploadModal] = useState<'resume' | 'avatar' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const normalizeProfile = (userData: any) => {
    // Start with empty safe defaults
    const normalized = {
      firstName: '',
      lastName: '',
      bio: '',
      phone: '',
      location: '',
      website: '',
      companyName: '',
      companyDescription: '',
      skills: [] as string[],
      experience: [] as any[],
      education: [] as any[],
      ...userData,
    };

    const nestedProfile = userData?.profile || {};
    
    // Extract and normalize each array field  
    const normalizeArray = (val: any): any[] => {
      if (Array.isArray(val)) return val;
      if (!val) return [];
      // If it's a single object, wrap it in an array
      if (typeof val === 'object' && Object.keys(val).length > 0) return [val];
      return [];
    };

    // Explicitly set normalized versions
    normalized.skills = normalizeArray(nestedProfile.skills || userData?.skills || [])
      .filter((s: any) => typeof s === 'string');
    
    normalized.experience = normalizeArray(nestedProfile.experience || userData?.experience || [])
      .filter((e: any) => typeof e === 'object' && e !== null);
    
    normalized.education = normalizeArray(nestedProfile.education || userData?.education || [])
      .filter((e: any) => typeof e === 'object' && e !== null);

    // Merge profile data on top with preference for nested values
    Object.assign(normalized, nestedProfile);
    normalized.profile = nestedProfile;

    // Ensure arrays stay arrays (critical!)
    normalized.skills = Array.isArray(normalized.skills) 
      ? normalized.skills.filter((s: any) => typeof s === 'string')
      : [];
    normalized.experience = Array.isArray(normalized.experience)
      ? normalized.experience.filter((e: any) => typeof e === 'object')
      : [];
    normalized.education = Array.isArray(normalized.education)
      ? normalized.education.filter((e: any) => typeof e === 'object')
      : [];

    return normalized;
  };

  // Role-based allowed fields
  const allowedFields = useMemo(() => {
    if (!session?.user?.role) return [];
    const role = session.user.role;
    if (role === ROLES.JOBSEEKER) {
      return [
        'firstName',
        'lastName',
        'bio',
        'phone',
        'location',
        'experienceYears',
        'skills',
        'experience',
        'education',
      ];
    } else {
      return [
        'firstName',
        'lastName',
        'companyName',
        'bio',
        'website',
        'companyDescription',
        'phone',
        'location',
      ];
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      let res;
      try {
        res = await api.get('/api/users/profile');
      } catch (error: any) {
        if (error?.response?.status === 404) {
          // Fallback for environments where profile is exposed via auth/me.
          res = await api.get('/api/auth/me');
        } else {
          throw error;
        }
      }
      const normalizedProfile = normalizeProfile(res.data.data);
      setProfile(normalizedProfile);
      // Init form data
      const initialData: any = {};
      allowedFields.forEach((field: string) => {
        if (field === 'skills' || field === 'experience' || field === 'education') {
          const value = normalizedProfile[field];
          // Extra safety: ensure these are definitely arrays
          initialData[field] = Array.isArray(value) ? value : [];
        } else {
          initialData[field] = normalizedProfile[field] || '';
        }
      });
      initialData.experienceYears = normalizedProfile.experienceYears ?? 0;
      setFormData(initialData);
    } catch (error) {
      toast.error('Failed to load profile');
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatePayload: any = {};
      allowedFields.forEach((field: string) => {
        const currentValue = profile?.[field];
        const nextValue = formData[field];
        const changed = Array.isArray(nextValue)
          ? JSON.stringify(nextValue) !== JSON.stringify(currentValue || [])
          : nextValue !== currentValue;

        if (changed) {
          updatePayload[field] = formData[field];
        }
      });
      if (Object.keys(updatePayload).length === 0) {
        toast('No changes detected');
        return;
      }
      const res = await api.put('/api/users/profile', updatePayload);
      setProfile(normalizeProfile(res.data.data));
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (file: File, endpoint: '/api/users/upload-resume' | '/api/users/upload-avatar', fieldName: 'resume' | 'avatar') => {
    const formData = new FormData();
    formData.append(fieldName, file);
    try {
      setUploadProgress(0);
      await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percent);
        },
      });
      toast.success(`${fieldName === 'resume' ? 'Resume' : 'Avatar'} uploaded successfully`);
      fetchProfile(); // Refresh
      setUploadModal(null);
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  const addExperience = () => {
    const current = Array.isArray(formData.experience) ? formData.experience : [];
    // Ensure we're adding to an actual array
    if (!Array.isArray(current)) {
      handleInputChange('experience', [{ title: '', company: '', startDate: '', endDate: '', current: false, description: '' }]);
      return;
    }
    handleInputChange('experience', [
      ...current,
      { title: '', company: '', startDate: '', endDate: '', current: false, description: '' },
    ]);
  };

  const updateExperience = (index: number, field: string, value: any) => {
    const current = Array.isArray(formData.experience) ? [...formData.experience] : [];
    current[index] = { ...(current[index] || {}), [field]: value };
    if (field === 'current' && value) {
      current[index].endDate = '';
    }
    handleInputChange('experience', current);
  };

  const removeExperience = (index: number) => {
    const current = Array.isArray(formData.experience) ? [...formData.experience] : [];
    current.splice(index, 1);
    handleInputChange('experience', current);
  };

  const addEducation = () => {
    const current = Array.isArray(formData.education) ? formData.education : [];
    handleInputChange('education', [
      ...current,
      { degree: '', institution: '', startDate: '', endDate: '', current: false },
    ]);
  };

  const updateEducation = (index: number, field: string, value: any) => {
    const current = Array.isArray(formData.education) ? [...formData.education] : [];
    current[index] = { ...(current[index] || {}), [field]: value };
    if (field === 'current' && value) {
      current[index].endDate = '';
    }
    handleInputChange('education', current);
  };

  const removeEducation = (index: number) => {
    const current = Array.isArray(formData.education) ? [...formData.education] : [];
    current.splice(index, 1);
    handleInputChange('education', current);
  };

  const addSkill = () => {
    const value = skillDraft.trim();
    if (!value) return;
    const current = Array.isArray(formData.skills) ? formData.skills : [];
    if (current.some((skill: string) => skill.toLowerCase() === value.toLowerCase())) {
      setSkillDraft('');
      return;
    }
    handleInputChange('skills', [...current, value]);
    setSkillDraft('');
  };

  const removeSkill = (skillToRemove: string) => {
    const current = Array.isArray(formData.skills) ? formData.skills : [];
    handleInputChange('skills', current.filter((skill: string) => skill !== skillToRemove));
  };


  const profileCompletion = useMemo(() => {
    if (!profile || !session?.user?.role) return 0;
    let complete = 0;
    const total = allowedFields.length;
    allowedFields.forEach((field: string) => {
      if (profile[field]) complete++;
    });
    return Math.round((complete / total) * 100);
  }, [profile, allowedFields]);

  // Helper to safely convert dates to displayable strings
  const safeDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (val instanceof Date) return val.toLocaleDateString();
    if (typeof val === 'object' && val.$date) return new Date(val.$date).toLocaleDateString();
    return String(val);
  };

  // Helper to safely convert to string for input fields
  const safeString = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return String(val);
    return String(val);
  };

  const resumeFileName = useMemo(() => {
    const rawUrl = safeString(profile?.profile?.resumeUrl);
    if (!rawUrl) return '';

    try {
      const withoutQuery = rawUrl.split('?')[0];
      const lastSegment = withoutQuery.split('/').pop() || '';
      return decodeURIComponent(lastSegment) || 'resume';
    } catch {
      return 'resume';
    }
  }, [profile]);

  // Helper to safely convert dates for date input fields (YYYY-MM-DD format)
  const safeDateInput = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val.slice(0, 10);
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    if (typeof val === 'object' && val.$date) {
      return new Date(val.$date).toISOString().slice(0, 10);
    }
    return String(val).slice(0, 10);
  };

  // Ensure formData arrays are always safe
  const safeFormData = useMemo(() => {
    return {
      ...formData,
      experience: Array.isArray(formData.experience) ? formData.experience : [],
      education: Array.isArray(formData.education) ? formData.education : [],
      skills: Array.isArray(formData.skills) ? formData.skills.filter((s: any) => typeof s === 'string') : [],
    };
  }, [formData]);

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="h-14 w-64 rounded-2xl bg-bg-secondary/60 animate-pulse" />
          <div className="h-28 rounded-3xl bg-bg-secondary/60 animate-pulse" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-56 rounded-3xl bg-bg-secondary/60 animate-pulse" />
            <div className="h-56 rounded-3xl bg-bg-secondary/60 animate-pulse" />
          </div>
          <div className="h-80 rounded-3xl bg-bg-secondary/60 animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="default" className="px-3 py-1">
              {session.user.role.toUpperCase()} Profile
            </Badge>
            <h1 className="text-4xl font-display font-black text-white tracking-tight">
              My Profile
            </h1>
            <p className="text-text-secondary font-medium">
              Complete your profile to increase visibility to recruiters.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              leftIcon={isEditing ? <X size={18} /> : <Edit3 size={18} />}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
            {isEditing && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>

        {/* Completion */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-bold text-white text-lg">Profile Completion</h3>
                <p className="text-sm text-text-secondary">Complete your profile to get 3x more opportunities</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-accent-primary">{profileCompletion}%</div>
                <div className="w-24 bg-bg-secondary rounded-full h-2 mt-1">
                  <div
                    className="bg-accent-primary h-2 rounded-full transition-all"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avatar & Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={24} />
              Profile Picture & Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-8 border-b border-border last:border-b-0">
              <div className="flex flex-col items-start gap-6 mb-8">
                <div className="flex-shrink-0">
                  <div className="relative group">
                    <Avatar
                      src={profile?.profile?.avatarUrl || undefined}
                      initials={`${profile?.firstName?.[0] || ''}${profile?.lastName?.[0] || ''}`.toUpperCase()}
                      size="lg"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -bottom-2 -right-2 p-0 w-10 h-10 bg-accent-primary hover:bg-accent-primary/90 rounded-full shadow-lg border-2 border-bg-primary"
                      onClick={() => setUploadModal('avatar')}
                    >
                      <Upload size={16} />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 space-y-4 min-w-0">
                  {isEditing ? (
                    <>
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-bold text-white mb-2">First Name</label>
                        <Input
                          id="firstName"
                          value={safeString(formData.firstName)}
                          onChange={(e) => handleInputChange('firstName', e.target.value)} label="First Name"                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-bold text-white mb-2">Last Name</label>
                        <Input
                          id="lastName"
                          value={safeString(formData.lastName)}
                          onChange={(e) => handleInputChange('lastName', e.target.value)} label="Last Name"                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-black text-white truncate">
                        {safeString(profile?.firstName)} {safeString(profile?.lastName)}
                      </h2>
                    </>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="default" className="uppercase px-4 py-1 text-sm font-black">
                      {session.user.role}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => setUploadModal('avatar')}>
                      <Upload size={16} />
                      {session.user.role === ROLES.RECRUITER ? 'Upload Company Logo' : 'Upload Avatar'}
                    </Button>
                  </div>
                  {profile?.bio && (
                    <p className="text-text-secondary leading-relaxed">{safeString(profile.bio)}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Location */}
        <div className="grid md:grid-cols-2 gap-6">
          {session.user.role === ROLES.JOBSEEKER ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText size={20} />
                    Resume
                  </CardTitle>
                  {profile?.profile?.resumeUrl && (
                    <CardDescription id="resume">
                      Current resume is attached to your profile.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Button
                      onClick={() => setUploadModal('resume')}
                      variant="outline"
                      className="w-full justify-start"
                      leftIcon={<Upload size={18} />}
                    >
                      {profile?.profile?.resumeUrl ? 'Update Resume' : 'Upload Resume'}
                    </Button>

                    {profile?.profile?.resumeUrl && (
                      <div className="rounded-2xl border border-border bg-bg-secondary/40 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <FileText size={16} className="text-accent-primary" />
                          <span className="font-medium truncate">Current resume uploaded</span>
                        </div>
                        <p className="text-xs text-text-tertiary truncate" title={resumeFileName}>
                          File: {resumeFileName || 'resume'}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <a
                            href={safeString(profile.profile.resumeUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-bold text-white hover:border-accent-primary hover:text-accent-primary transition-colors"
                          >
                            Open Resume
                          </a>
                          <a
                            href={safeString(profile.profile.resumeUrl)}
                            download
                            className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-bold text-white hover:border-accent-primary hover:text-accent-primary transition-colors"
                          >
                            Download
                          </a>
                        </div>

                        {safeString(profile.profile.resumeUrl).toLowerCase().includes('.pdf') && (
                          <iframe
                            src={safeString(profile.profile.resumeUrl)}
                            title="Resume preview"
                            className="h-72 w-full rounded-xl border border-border bg-bg-primary"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin size={20} />
                    Location & Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-0">
                  <div className="p-6 border-b border-border">
                    {isEditing ? (
                      <div>
                        <label htmlFor="location" className="block text-sm font-bold text-white mb-2">Location</label>
                        <Input
                          id="location"
                          placeholder="e.g., San Francisco, CA"
                          value={safeString(formData.location)}
                          onChange={(e) => handleInputChange('location', e.target.value)} label="Location"                        />
                      </div>
                    ) : (
                      profile?.location && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <MapPin size={18} className="text-accent-primary flex-shrink-0" />
                          <span>{safeString(profile.location)}</span>
                        </div>
                      )
                    )}
                  </div>
                  <div className="p-6">
                    {isEditing ? (
                      <div>
                        <label htmlFor="phone" className="block text-sm font-bold text-white mb-2">Phone</label>
                        <Input
                          id="phone"
                          placeholder="e.g., +1 (555) 123-4567"
                          value={safeString(formData.phone)}
                          onChange={(e) => handleInputChange('phone', e.target.value)} label="Phone"                        />
                      </div>
                    ) : (
                      profile?.phone && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Phone size={18} className="text-accent-primary flex-shrink-0" />
                          <span>{safeString(profile.phone)}</span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Recruiter Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase size={20} />
                    Company Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <>
                      <div>
                        <label htmlFor="companyName" className="block text-sm font-bold text-white mb-2">Company Name</label>
                        <Input
                            id="companyName"
                            value={safeString(formData.companyName)}
                            onChange={(e) => handleInputChange('companyName', e.target.value)} label="Company Name"                        />
                      </div>
                      <div>
                        <label htmlFor="website" className="block text-sm font-bold text-white mb-2">Website</label>
                        <Input
                            id="website"
                            placeholder="https://company.com"
                            value={safeString(formData.website)}
                            onChange={(e) => handleInputChange('website', e.target.value)} label="Website"                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {profile?.companyName && (
                        <div className="text-xl font-black text-white">{safeString(profile.companyName)}</div>
                      )}
                      {profile?.website && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Globe size={18} />
                          <a href={safeString(profile.website)} className="hover:text-accent-primary">{safeString(profile.website)}</a>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin size={20} />
                    Company Location & Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-0">
                  <div className="p-6 border-b border-border">
                    {isEditing ? (
                      <div>
                        <label htmlFor="location" className="block text-sm font-bold text-white mb-2">Location</label>
                        <Input
                            id="location"
                            value={safeString(formData.location)}
                            onChange={(e) => handleInputChange('location', e.target.value)} label="Location"                        />
                      </div>
                    ) : (
                      profile?.location && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <MapPin size={18} className="text-accent-primary" />
                          {safeString(profile.location)}
                        </div>
                      )
                    )}
                  </div>
                  <div className="p-6">
                    {isEditing ? (
                      <div>
                        <label htmlFor="phone" className="block text-sm font-bold text-white mb-2">Phone</label>
                        <Input
                            id="phone"
                            value={safeString(formData.phone)}
                            onChange={(e) => handleInputChange('phone', e.target.value)} label="Phone"                        />
                      </div>
                    ) : (
                      profile?.phone && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Phone size={18} className="text-accent-primary" />
                          {safeString(profile.phone)}
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase size={20} />
                    Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {session.user.role === ROLES.JOBSEEKER ? (
                    isEditing ? (
                      <div>
                        <label htmlFor="experienceYears" className="block text-sm font-bold text-white mb-2">Years of experience</label>
                        <Input
                          id="experienceYears"
                          type="number"
                          min={0}
                          value={safeString(formData.experienceYears)}
                          onChange={(e) => handleInputChange('experienceYears', Number(e.target.value))}
                          label="Years of Experience"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Briefcase size={18} className="text-accent-primary" />
                        <span>{profile?.experienceYears ?? 0} years</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Briefcase size={18} className="text-accent-primary" />
                      <span>Company profile and logo are managed from the avatar upload.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Skills & Experience (Jobseeker) or Company Description (Recruiter) */}
        {session.user.role === ROLES.JOBSEEKER && (
          <Card id="skills">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 size={20} />
                Skills & Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <label htmlFor="skills" className="block text-sm font-bold text-white mb-2">Skills</label>
                <div className="rounded-2xl border border-border bg-bg-secondary/40 p-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(formData.skills) ? formData.skills : []).map((skill: string) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => isEditing && removeSkill(skill)}
                        className="inline-flex items-center gap-2 rounded-full border border-accent-primary/20 bg-accent-primary/10 px-3 py-1 text-xs font-bold text-accent-primary"
                      >
                        {skill}
                        {isEditing && <X size={12} />}
                      </button>
                    ))}
                  </div>
                  {isEditing ? (
                    <div className="flex gap-3">
                      <Input
                        id="skills"
                        placeholder="Add a skill and press Enter"
                        value={skillDraft}
                        onChange={(e) => setSkillDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSkill();
                          }
                        }}
                        label="Add Skill"
                      />
                      <Button type="button" variant="outline" onClick={addSkill}>
                        Add
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-text-tertiary">Click edit to add or remove skills.</p>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-white">Work Experience</label>
                  {isEditing && (
                    <Button type="button" variant="outline" size="sm" onClick={addExperience}>
                      Add Experience
                    </Button>
                  )}
                </div>
                {(Array.isArray(formData.experience) ? formData.experience : []).length === 0 && !isEditing && (
                  <p className="text-sm text-text-tertiary">No experience added yet.</p>
                )}
                <div className="space-y-4">
                  {safeFormData.experience.map((exp: any, index: number) => (
                    <div key={`exp-${index}`} className="rounded-xl border border-border bg-bg-secondary/40 p-4 space-y-3">
                      {isEditing ? (
                        <>
                          <div className="grid md:grid-cols-2 gap-3">
                            <Input
                              label="Job Title"
                              value={safeString(exp.title)}
                              onChange={(e) => updateExperience(index, 'title', e.target.value)}
                            />
                            <Input
                              label="Company"
                              value={safeString(exp.company)}
                              onChange={(e) => updateExperience(index, 'company', e.target.value)}
                            />
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            <Input
                              type="date"
                              label="Start Date"
                              value={safeDateInput(exp.startDate)}
                              onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                            />
                            <Input
                              type="date"
                              label="End Date"
                              value={safeDateInput(exp.endDate)}
                              onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                              disabled={!!exp.current}
                            />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-text-secondary">
                            <input
                              type="checkbox"
                              checked={!!exp.current}
                              onChange={(e) => updateExperience(index, 'current', e.target.checked)}
                            />
                            I currently work here
                          </label>
                          <textarea
                            rows={3}
                            className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-vertical font-medium"
                            placeholder="What did you achieve in this role?"
                            value={safeString(exp.description)}
                            onChange={(e) => updateExperience(index, 'description', e.target.value)}
                          />
                          <div className="flex justify-end">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeExperience(index)}>
                              Remove
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-white font-semibold">{safeString(exp.title) || 'Untitled role'}</p>
                          <p className="text-text-secondary text-sm">{safeString(exp.company) || 'Company not specified'}</p>
                          <p className="text-text-tertiary text-xs">
                            {safeDate(exp.startDate) || 'Start not set'} - {!!exp.current ? 'Present' : safeDate(exp.endDate) || 'End not set'}
                          </p>
                          {exp.description && <p className="text-sm text-text-secondary">{safeString(exp.description)}</p>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-white">Education</label>
                  {isEditing && (
                    <Button type="button" variant="outline" size="sm" onClick={addEducation}>
                      Add Education
                    </Button>
                  )}
                </div>
                {(Array.isArray(formData.education) ? formData.education : []).length === 0 && !isEditing && (
                  <p className="text-sm text-text-tertiary">No education added yet.</p>
                )}
                <div className="space-y-4">
                  {safeFormData.education.map((edu: any, index: number) => (
                    <div key={`edu-${index}`} className="rounded-xl border border-border bg-bg-secondary/40 p-4 space-y-3">
                      {isEditing ? (
                        <>
                          <div className="grid md:grid-cols-2 gap-3">
                            <Input
                              label="Degree"
                              value={safeString(edu.degree)}
                              onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                            />
                            <Input
                              label="Institution"
                              value={safeString(edu.institution)}
                              onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                            />
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            <Input
                              type="date"
                              label="Start Date"
                              value={safeDateInput(edu.startDate)}
                              onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                            />
                            <Input
                              type="date"
                              label="End Date"
                              value={safeDateInput(edu.endDate)}
                              onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                              disabled={!!edu.current}
                            />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-text-secondary">
                            <input
                              type="checkbox"
                              checked={!!edu.current}
                              onChange={(e) => updateEducation(index, 'current', e.target.checked)}
                            />
                            I currently study here
                          </label>
                          <div className="flex justify-end">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeEducation(index)}>
                              Remove
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-white font-semibold">{safeString(edu.degree) || 'Degree not specified'}</p>
                          <p className="text-text-secondary text-sm">{safeString(edu.institution) || 'Institution not specified'}</p>
                          <p className="text-text-tertiary text-xs">
                            {safeDate(edu.startDate) || 'Start not set'} - {!!edu.current ? 'Present' : safeDate(edu.endDate) || 'End not set'}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {session.user.role === ROLES.RECRUITER && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 size={20} />
                Company Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {isEditing ? (
                <>
                  <div>
                    <label htmlFor="bio" className="block text-sm font-bold text-white mb-2">Bio</label>
                    <textarea
                      id="bio"
                      rows={4}
                      className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-vertical"
                      placeholder="Tell us about yourself/company..."
                      value={safeString(formData.bio)}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="companyDescription" className="block text-sm font-bold text-white mb-2">Company Description</label>
                    <textarea
                      id="companyDescription"
                      rows={6}
                      className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-vertical"
                      placeholder="Detailed company overview, hiring process..."
                      value={safeString(formData.companyDescription)}
                      onChange={(e) => handleInputChange('companyDescription', e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  {profile?.bio && (
                    <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">{safeString(profile.bio)}</p>
                  )}
                  {profile?.companyDescription && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <h4 className="font-bold text-white mb-3">About the Company</h4>
                      <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">{safeString(profile.companyDescription)}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Generic Bio for Jobseeker */}
        {session.user.role === ROLES.JOBSEEKER && (
          <Card id="experience">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 size={20} />
                Professional Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isEditing ? (
                <div className="p-6">
                  <label htmlFor="bio" className="block text-sm font-bold text-white mb-2">Bio</label>
                  <textarea
                    id="bio"
                    rows={6}
                    className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-vertical"
                    placeholder="Write a compelling bio about your expertise..."
                    value={safeString(formData.bio)}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                  />
                </div>
              ) : (
                profile?.bio && (
                  <div className="p-6 prose prose-invert max-w-none">
                    <p className="text-text-secondary leading-relaxed whitespace-pre-wrap text-lg">{safeString(profile.bio)}</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Modal */}
      <Modal 
        isOpen={!!uploadModal} 
        onClose={() => setUploadModal(null)}
        title={`Upload ${uploadModal === 'resume' ? 'Resume' : 'Profile Picture'}`}
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent-primary/50 transition-colors">
            <Upload className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <div>
              <p className="text-lg font-bold text-white mb-1">Drag & drop file here</p>
              <p className="text-sm text-text-secondary mb-6">
                {uploadModal === 'resume' ? 'PDF, DOC, DOCX up to 5MB' : 'JPG, PNG, GIF up to 5MB'}
              </p>
              <input
                id="file-upload"
                type="file"
                accept={uploadModal === 'resume' ? '.pdf,.doc,.docx' : 'image/*'}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(
                      file,
                      uploadModal === 'resume' ? '/api/users/upload-resume' : '/api/users/upload-avatar',
                      uploadModal!
                    );
                  }
                }}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/30 px-6 py-2.5 rounded-xl font-bold text-sm transition-all inline-block"
              >
                Select File
              </label>
            </div>
          </div>
          {uploadProgress > 0 && (
            <div className="bg-bg-secondary rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-border rounded-full h-2">
                  <div
                    className="bg-accent-primary h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-white">{uploadProgress}%</span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
