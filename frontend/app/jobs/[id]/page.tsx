'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import ReactMarkdown from 'react-markdown';
import { format, differenceInDays } from 'date-fns';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  MapPin, Clock, DollarSign, Building, Globe, CheckCircle2, ChevronRight, Share2, Briefcase
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import ApplyModal from '@/components/ui/ApplyModal';
import { toast } from 'react-hot-toast';

export default function JobDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  
  // Fetch job details
  const fetchJob = async () => {
    try {
      const response = await api.get(`/api/jobs/${id}`);
      setJob(response.data.data);
    } catch (error: any) {
      toast.error('Failed to load job details');
      if (error.response?.status === 404) router.push('/jobs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch after auth state resolves so userApplication is returned for logged-in jobseekers.
    if (status === 'loading') return;
    fetchJob();
  }, [id, status]);

  const {
    companyName, companyLogo, companyWebsite, companyDesc,
    isApplied, appliedStage,
    formattedSalary,
    daysUntil, isUrgent, deadlineText
  } = useMemo(() => {
    if (!job) return {} as any;

    const cName = job.company?.name || job.postedBy?.company || 'Confidential Company';
    const cLogo = job.company?.logo?.url;
    const cWeb = job.company?.website;
    const cDesc = job.company?.description || "A forward-thinking company pushing boundaries in their industry.";

    const _appliedStatus = job.userApplication || null;

    let salaryStr = null;
    if (job.isUnpaid) {
      salaryStr = 'Unpaid';
    }
    if (job.salary) {
      const { min, max, currency = 'USD' } = job.salary;
      const currencySymbolMap: Record<string, string> = {
        USD: '$',
        EUR: 'EUR',
        GBP: 'GBP',
        INR: 'Rs',
        CAD: 'CAD'
      };
      const symbol = currencySymbolMap[currency] || currency;
      if (min && max) salaryStr = `${symbol}${min.toLocaleString()} - ${symbol}${max.toLocaleString()}`;
      else if (min) salaryStr = `From ${symbol}${min.toLocaleString()}`;
      else if (max) salaryStr = `Up to ${symbol}${max.toLocaleString()}`;
    }

    const dateStr = job.expiryDate || job.deadline;
    let days: number | null = null;
    let deadlineTxt = 'No deadline';
    let urgent = false;

    if (dateStr) {
      const expiry = new Date(dateStr);
      if (!isNaN(expiry.getTime())) {
        days = differenceInDays(expiry, new Date());
        if (days < 0) deadlineTxt = 'Expired';
        else if (days === 0) deadlineTxt = 'Ends today';
        else deadlineTxt = `${days} days left`;
        urgent = days > 0 && days <= 7;
      }
    }

    return {
      companyName: cName,
      companyLogo: cLogo,
      companyWebsite: cWeb,
      companyDesc: cDesc,
      isApplied: !!_appliedStatus,
      appliedStage: _appliedStatus,
      formattedSalary: salaryStr,
      daysUntil: days,
      isUrgent: urgent,
      deadlineText: deadlineTxt
    };
  }, [job]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <Navbar />
        <div className="pt-32 pb-24 container max-w-7xl mx-auto px-6 lg:px-8 border-b border-border mb-12 flex justify-center py-24">
           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-primary" />
        </div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans">
      <Navbar />

      <main className="pt-28 pb-24">
        {/* Breadcrumb */}
        <div className="container max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <nav className="flex items-center text-sm font-bold text-text-tertiary">
            <Link href="/jobs" className="hover:text-accent-primary transition-colors">Jobs</Link>
            <ChevronRight size={14} className="mx-2" />
            <span className="text-text-primary line-clamp-1">{job.title}</span>
          </nav>
        </div>

        <section className="container max-w-7xl mx-auto px-6 lg:px-8 mt-4 flex flex-col lg:flex-row gap-12 items-start">
          
          {/* Left Column (Main Details) - 2/3 Width */}
          <div className="flex-1 w-full space-y-12">
            
            {/* Header / Title */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-display font-black text-white tracking-tight leading-[1.1]">
                  {job.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-lg">
                  <span className="font-bold text-accent-primary">{companyName}</span>
                  <span className="text-text-tertiary">•</span>
                  <span className="text-text-secondary">{format(new Date(job.createdAt), 'MMM dd, yyyy')}</span>
                  {deadlineText && (
                    <>
                      <span className="text-text-tertiary">•</span>
                      <span className={`font-bold ${isUrgent ? 'text-accent-danger' : 'text-text-tertiary'} flex items-center gap-1.5`}>
                        <Clock size={16} /> 
                        {deadlineText}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="ghost" className="bg-bg-secondary text-text-primary border-none px-3 py-1.5 font-bold flex items-center gap-2">
                  <MapPin size={16} className="text-text-tertiary" /> {job.location}
                </Badge>
                <Badge variant="ghost" className="bg-bg-secondary text-text-primary border-none px-3 py-1.5 font-bold flex items-center gap-2 capitalize">
                  <Briefcase size={16} className="text-text-tertiary" /> {job.type?.replace('-', ' ') || 'N/A'}
                </Badge>
                {(job.workMode || job.type === 'remote') && (
                  <Badge variant="ghost" className="bg-accent-secondary/10 text-accent-secondary border-none px-3 py-1.5 font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]">
                    <Globe size={16} /> {job.workMode || 'Remote'}
                  </Badge>
                )}
                {formattedSalary && (
                  <Badge variant="ghost" className="bg-bg-secondary text-text-primary border-none px-3 py-1.5 font-bold flex items-center gap-2">
                    <DollarSign size={16} className="text-text-tertiary" /> {formattedSalary}
                  </Badge>
                )}
              </div>
            </div>

            <div className="w-full h-[1px] bg-border" />

            {/* About Role */}
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-black text-white tracking-tight">About the Role</h2>
              <div className="prose prose-invert prose-p:text-text-secondary prose-a:text-accent-primary max-w-none text-lg leading-relaxed">
                <ReactMarkdown>{job.description}</ReactMarkdown>
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-black text-white tracking-tight">Requirements</h2>
                <ul className="space-y-3">
                  {job.requirements.map((req: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-4 text-lg text-text-secondary leading-relaxed">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-primary flex-shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-black text-white tracking-tight">Skills & Tech Stack</h2>
                <div className="flex flex-wrap gap-3">
                  {job.skills.map((skill: string, idx: number) => (
                    <span key={idx} className="px-4 py-2 rounded-xl border border-border bg-bg-secondary text-sm font-bold text-text-primary">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Sticky Box) - 1/3 Width */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 lg:sticky lg:top-32 space-y-6">
            
            {/* CTA Applier Card */}
            <Card className="p-1 space-y-0 bg-gradient-to-br from-bg-card to-bg-secondary border-border rounded-3xl overflow-hidden">
               <div className="p-6 pb-4">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-16 h-16 bg-bg-primary rounded-2xl flex items-center justify-center flex-shrink-0 border border-border shadow-inner">
                        {companyLogo ? (
                           <img src={companyLogo} alt={companyName} className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                           <Building size={24} className="text-text-tertiary" />
                        )}
                     </div>
                     <div>
                        <h3 className="text-xl font-display font-black text-white line-clamp-1">{companyName}</h3>
                        {companyWebsite && (
                           <a href={companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-accent-primary hover:underline flex items-center gap-1 mt-1">
                              Visit Website <Globe size={10} />
                           </a>
                        )}
                     </div>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed line-clamp-4">
                     {companyDesc}
                  </p>
               </div>
               
               <div className="p-6 pt-4 border-t border-border/50 space-y-4">
                 {isApplied ? (
                   <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-accent-primary/5 border border-accent-primary/20 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <CheckCircle2 size={18} className="text-accent-primary" />
                           <span className="text-sm font-bold text-accent-primary">Applied</span>
                         </div>
                         <Badge variant={appliedStage === 'rejected' ? 'rejected' : appliedStage === 'offer' ? 'offer' : 'screening'} className="uppercase">
                            {appliedStage}
                         </Badge>
                      </div>
                      <Link href="/jobseeker/applications" className="block w-full">
                         <Button variant="outline" className="w-full font-bold">View Application</Button>
                      </Link>
                   </div>
                 ) : (
                   <Button 
                     onClick={() => {
                        if (!session) {
                           toast('Please sign in to apply', { icon: '👋' });
                           router.push('/login');
                           return;
                        }
                        setIsApplyModalOpen(true);
                     }}
                     disabled={daysUntil < 0}
                     className="w-full py-6 text-lg font-black shadow-[0_0_20px_rgba(110,231,183,0.15)] hover:shadow-[0_0_30px_rgba(110,231,183,0.3)] transition-all"
                   >
                     {daysUntil < 0 ? 'Applications Closed' : 'Apply Now'}
                   </Button>
                 )}
                 <button className="flex items-center justify-center gap-2 w-full py-2 text-sm font-bold text-text-tertiary hover:text-white transition-colors">
                    <Share2 size={16} /> Share Role
                 </button>
               </div>
            </Card>
          </div>
        </section>
      </main>

      {/* Apply Modal */}
      {session && (
         <ApplyModal 
            isOpen={isApplyModalOpen}
            onClose={() => setIsApplyModalOpen(false)}
            jobId={id as string}
            jobTitle={job.title}
            companyName={companyName}
            onSuccess={() => {
               fetchJob(); // Refetch to get "Applied" status
            }}
         />
      )}
    </div>
  );
}
