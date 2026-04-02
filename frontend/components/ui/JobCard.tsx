"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import Avatar from './Avatar';
import Badge from './Badge';

export interface JobCardProps {
  job: {
    _id: string;
    title: string;
    company?: { name: string; logo?: { url: string } };
    location: string;
    type?: string;
    workMode?: string;
    salary?: { min?: number; max?: number; currency?: string };
    skills: string[];
    expiryDate: string;
    postedBy?: { firstName: string; lastName: string; company?: string };
  };
  hasApplied?: boolean;
}

const JobCard: React.FC<JobCardProps> = ({ job, hasApplied }) => {
  // Derive company name and logo safely
  const companyName = job.company?.name || job.postedBy?.company || 'Confidential Company';
  const companyLogo = job.company?.logo?.url || undefined;
  
  // Salary formatting
  const formattedSalary = useMemo(() => {
    if (!job.salary) return null;
    const { min, max, currency = 'USD' } = job.salary;
    const symbol = currency === 'USD' ? '$' : currency;
    
    if (min && max) return `${symbol}${min.toLocaleString()} - ${symbol}${max.toLocaleString()}`;
    if (min) return `From ${symbol}${min.toLocaleString()}`;
    if (max) return `Up to ${symbol}${max.toLocaleString()}`;
    return null;
  }, [job.salary]);

  // Deadline calculation
  const { daysUntil, isUrgent, deadlineText } = useMemo(() => {
    const expiry = new Date(job.expiryDate);
    const days = differenceInDays(expiry, new Date());
    
    if (days < 0) return { daysUntil: days, isUrgent: false, deadlineText: 'Expired' };
    
    return {
      daysUntil: days,
      isUrgent: days <= 3,
      deadlineText: days === 0 ? 'Ends today' : `${days} days left`
    };
  }, [job.expiryDate]);

  // Skill truncation
  const visibleSkills = job.skills.slice(0, 3);
  const remainingSkills = job.skills.length - 3;

  return (
    <Link href={`/jobs/${job._id}`} className="block outline-none group h-full">
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "h-full relative overflow-hidden flex flex-col justify-between rounded-3xl border border-border bg-bg-card p-6 transition-all duration-300",
          "hover:border-accent-primary/40 hover:shadow-[0_0_30px_rgba(110,231,183,0.15)] focus:border-accent-primary"
        )}
      >
        {/* Top Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex-shrink-0">
                {companyLogo ? (
                  <img src={companyLogo} alt={companyName} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Avatar initials={companyName?.[0] || ''} size="lg" className="rounded-xl w-full h-full text-lg" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-display font-black text-text-primary group-hover:text-accent-primary transition-colors line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-sm font-bold text-text-secondary">{companyName}</p>
              </div>
            </div>

            {hasApplied && (
              <Badge variant="applied" className="flex items-center gap-1.5 flex-shrink-0 bg-accent-primary/10 text-accent-primary border-accent-primary/20">
                <CheckCircle2 size={12} />
                <span className="hidden sm:inline">Applied</span>
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="ghost" className="bg-elevated text-text-secondary border-none font-medium flex items-center gap-1.5">
              <MapPin size={12} /> {job.location}
            </Badge>
            <Badge variant="ghost" className="bg-elevated text-text-secondary border-none font-medium capitalize">
              {job.type?.replace('-', ' ') || 'N/A'}
            </Badge>
            {(job.workMode || job.type === 'remote') && (
              <Badge variant="ghost" className="bg-accent-primary/5 text-accent-primary border-none font-medium text-[10px] tracking-wider uppercase">
                {job.workMode || 'Remote'}
              </Badge>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col space-y-4">
          
          <div className="flex items-center justify-between">
            {formattedSalary ? (
              <div className="flex items-center gap-1.5 font-bold text-text-primary">
                <DollarSign size={16} className="text-text-tertiary" />
                {formattedSalary}
              </div>
            ) : (
              <div className="text-sm font-medium text-text-tertiary">Salary undisclosed</div>
            )}

            <div className={cn(
              "flex items-center gap-1.5 text-xs font-bold",
              isUrgent ? "text-accent-danger" : "text-text-tertiary"
            )}>
              <Clock size={14} />
              {deadlineText}
            </div>
          </div>

          {(visibleSkills.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {visibleSkills.map((skill, idx) => (
                 <span key={idx} className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md bg-bg-secondary text-text-secondary border border-border">
                    {skill}
                 </span>
              ))}
              {remainingSkills > 0 && (
                 <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md bg-bg-primary text-text-tertiary border border-dashed border-border">
                    +{remainingSkills}
                 </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
};

export default JobCard;
