'use client';
import { TrendingUp } from "lucide-react";
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardUserPanel from '@/components/layout/DashboardUserPanel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  Briefcase, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';

const STAGES = ['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'];

export default function JobseekerDashboardPage() {
  const { data: session } = useSession();
  const [applications, setApplications] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatRelativeTime = (isoDate?: string) => {
    if (!isoDate) return 'Now';
    const then = new Date(isoDate).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - then);
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const getProfile = async () => {
        try {
          return await api.get('/api/users/profile');
        } catch (error: any) {
          if (error?.response?.status === 404) {
            return api.get('/api/auth/me');
          }
          throw error;
        }
      };

      const [appRes, meRes, notifRes] = await Promise.all([
        api.get('/api/applications/my?limit=50'),
        getProfile(),
        api.get('/api/notifications?limit=5&page=1')
      ]);
      setApplications(appRes.data.data);
      setProfile(meRes.data.data.profile);
      setNotifications(notifRes?.data?.data?.notifications || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchDashboardData();
  }, [session]);

  const profileStatus = useMemo(() => {
    if (!profile) return { isComplete: true, percent: 100, missing: [] }; // Hide skeleton while loading
    
    let score = 0;
    const missing = [];
    
    if (profile.resumeUrl) score += 40;
    else missing.push({ label: 'Resume', path: '/profile#resume' });
    
    if (profile.skills && profile.skills.length > 0) score += 30;
    else missing.push({ label: 'Skills', path: '/profile#skills' });
    
    if (profile.experience && profile.experience.length > 0) score += 30;
    else missing.push({ label: 'Experience', path: '/profile#experience' });
    
    return {
      isComplete: score === 100,
      percent: score,
      missing
    };
  }, [profile]);

  const stats = useMemo(() => {
    return {
      total: applications.length,
      active: applications.filter(a => !['offer', 'rejected', 'withdrawn'].includes(a.stage)).length,
      interviews: applications.filter(a => a.stage === 'interview').length,
      offers: applications.filter(a => a.stage === 'offer').length,
    };
  }, [applications]);

  const containerAnimations = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemAnimations = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="screening" className="px-3 py-1 text-[10px] uppercase font-black tracking-widest bg-accent-primary/10 text-accent-primary border-none">
              Candidate View
            </Badge>
            <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-none">
              Welcome back, <span className="text-accent-primary italic">{session?.user?.name?.split(' ')[0]}</span>.
            </h1>
            <p className="text-text-secondary font-medium tracking-tight">
              Track your applications and land your dream role.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <Link href="/jobs">
               <Button className="px-6 py-3 font-bold rounded-xl whitespace-nowrap">
                  Browse More Jobs
               </Button>
            </Link>
            <DashboardUserPanel />
          </div>
        </header>

        {/* Profile Completion Alert */}
        {!profileStatus.isComplete && !isLoading && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
             <Card className="bg-accent-warning/10 border border-accent-warning/20">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 gap-4">
                  <div className="flex items-center gap-4">
                     <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                           <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-accent-warning/20" />
                           <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={Math.PI * 2 * 20} strokeDashoffset={Math.PI * 2 * 20 * (1 - profileStatus.percent / 100)} className="text-accent-warning" />
                        </svg>
                        <span className="absolute text-[10px] font-black text-white">{profileStatus.percent}%</span>
                     </div>
                     <div>
                       <h3 className="text-sm font-bold text-white">Your profile is incomplete</h3>
                       <p className="text-xs text-text-secondary mt-1 max-w-2xl">
                         Recruiters are 3x more likely to shortlist completed profiles. Missing: 
                         {profileStatus.missing.map((m, i) => (
                            <Link key={m.label} href={m.path} className="text-accent-warning hover:underline mx-1">
                               {m.label}{i < profileStatus.missing.length - 1 ? ',' : ''}
                            </Link>
                         ))}
                       </p>
                     </div>
                  </div>
                  <Button variant="secondary" className="text-xs bg-bg-primary text-white border-accent-warning/30 hover:bg-accent-warning/10 whitespace-nowrap">
                     Update Profile
                  </Button>
               </div>
             </Card>
          </motion.div>
        )}

        {/* Stats Row */}
        {!isLoading && (
          <motion.div 
            variants={containerAnimations}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {[
              { label: 'Total Applied', value: stats.total, trend: '+12%', icon: Briefcase, color: 'text-text-primary', bg: 'bg-elevated' },
              { label: 'Active Progress', value: stats.active, trend: '+3', icon: TrendingUp, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
              { label: 'Interviews', value: stats.interviews, trend: 'New', icon: Users, color: 'text-accent-secondary', bg: 'bg-accent-secondary/10' },
              { label: 'Offers', value: stats.offers, trend: '+1', icon: CheckCircle2, color: 'text-luxury', bg: 'bg-luxury/10' },
            ].map((stat, idx) => (
              <motion.div key={idx} variants={itemAnimations}>
                <Card className="hover:border-border/80 transition-colors h-full">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                        <stat.icon size={20} />
                      </div>
                      <span className={`text-[10px] font-black tracking-widest ${stat.trend === 'New' ? 'text-accent-secondary' : 'text-accent-primary'}`}>
                        {stat.trend}
                      </span>
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

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/jobseeker/applications">
            <Card className="hover:border-border/80 transition-all cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-elevated text-text-primary">
                    <Briefcase size={20} />
                  </div>
                  <ArrowUpRight size={16} className="text-text-tertiary group-hover:text-accent-primary transition-colors" />
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-display font-black text-white">{stats.total}</div>
                  <div className="text-sm font-bold text-text-secondary">Total Applications</div>
                  <div className="text-xs text-text-tertiary mt-2">View and manage all your job applications</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/jobs">
            <Card className="hover:border-border/80 transition-all cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-accent-primary/10 text-accent-primary">
                    <Briefcase size={20} />
                  </div>
                  <ArrowUpRight size={16} className="text-text-tertiary group-hover:text-accent-primary transition-colors" />
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-display font-black text-white">Browse</div>
                  <div className="text-sm font-bold text-text-secondary">Find New Opportunities</div>
                  <div className="text-xs text-text-tertiary mt-2">Discover and apply to your next role</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
        
        {/* Recent Notifications Sidebar */}
        <div className="space-y-6 hidden lg:block">
           <Card className="border-border bg-gradient-to-br from-bg-card to-bg-secondary sticky top-24">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                 <CardTitle className="text-sm font-display font-black uppercase tracking-widest text-white">Notifications</CardTitle>
                 <Link href="/notifications" className="text-xs font-bold text-accent-primary hover:underline">View All</Link>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                  {notifications.length === 0 && (
                    <p className="text-sm text-text-tertiary">No notifications yet.</p>
                  )}
                  {notifications.map((notify, idx) => (
                    <div key={notify._id || idx} className="flex gap-3 group cursor-pointer hover:bg-elevated/40 p-2 -mx-2 rounded-xl transition-all">
                       <div className="mt-1.5 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${!notify.read ? 'bg-accent-primary shadow-[0_0_8px_#6EE7B7]' : 'bg-text-tertiary'}`} />
                       </div>
                       <div className="pr-2">
                        <p className={`text-sm ${!notify.read ? 'text-white font-bold' : 'text-text-secondary font-medium'} group-hover:text-accent-primary transition-colors leading-tight`}>
                         {notify.title}
                        </p>
                        <p className="text-[10px] text-text-tertiary mt-1.5 uppercase font-bold tracking-widest">
                         {formatRelativeTime(notify.createdAt)}
                        </p>
                       </div>
                    </div>
                 ))}
              </CardContent>
           </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
