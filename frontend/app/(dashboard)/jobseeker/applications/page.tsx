'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  Briefcase, 
  Users, 
  CheckCircle2, 
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Building
} from 'lucide-react';
import api from '@/lib/axios';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

const TAB_STAGES = ['all', 'applied', 'screening', 'interview', 'offer', 'rejected'];

export default function ApplicationsPage() {
  const { data: session } = useSession();
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const appRes = await api.get('/api/applications/my?limit=50');
      setApplications(appRes.data.data);
    } catch (error) {
      console.error('Failed to fetch applications', error);
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchApplications();
  }, [session]);

  const handleWithdraw = async (appId: string) => {
    try {
      if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) return;
      await api.patch(`/api/applications/${appId}/withdraw`);
      toast.success('Application withdrawn');
      fetchApplications();
    } catch (error) {
      toast.error('Failed to withdraw application');
    }
  };

  const stats = useMemo(() => {
    return {
      total: applications.length,
      active: applications.filter(a => !['offer', 'rejected', 'withdrawn'].includes(a.stage)).length,
      interviews: applications.filter(a => a.stage === 'interview').length,
      offers: applications.filter(a => a.stage === 'offer').length,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    if (activeTab === 'all') return applications;
    return applications.filter(a => a.stage === activeTab);
  }, [applications, activeTab]);

  const containerAnimations = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemAnimations = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const renderStepper = (currentStage: string) => {
    const progression = ['applied', 'screening', 'interview', 'offer'];
    const safeStage = currentStage === 'rejected' || currentStage === 'withdrawn' ? 'applied' : currentStage;
    const currentIndex = progression.indexOf(safeStage);
    
    return (
      <div className="flex items-center w-full max-w-sm mt-4">
        {progression.map((step, idx) => {
          const isActive = idx <= currentIndex;
          const isFailed = currentStage === 'rejected' && step === 'applied';
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
               <div className="flex flex-col items-center gap-1.5 relative z-10">
                 <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-accent-primary shadow-[0_0_10px_#6EE7B7]' : currentStage === 'rejected' ? 'bg-accent-danger' : 'bg-border'}`} />
                 <span className={`absolute top-4 text-[9px] uppercase font-bold tracking-wider ${isActive ? 'text-accent-primary' : 'text-text-tertiary'}`}>
                   {step}
                 </span>
               </div>
               {idx < progression.length - 1 && (
                 <div className={`h-[2px] flex-1 mx-2 rounded-full ${idx < currentIndex ? 'bg-accent-primary' : 'bg-border'}`} />
               )}
            </div>
          )
        })}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="screening" className="px-3 py-1 text-[10px] uppercase font-black tracking-widest bg-accent-primary/10 text-accent-primary border-none">
              My Applications
            </Badge>
            <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-none">
              Track your applications
            </h1>
            <p className="text-text-secondary font-medium tracking-tight">
              Monitor your job search progress and manage your applications.
            </p>
          </div>
          <Link href="/jobs">
             <Button className="px-6 py-3 font-bold rounded-xl whitespace-nowrap">
                Browse More Jobs
             </Button>
          </Link>
        </header>

        {/* Stats Row */}
        {!isLoading && (
          <motion.div 
            variants={containerAnimations}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {[
              { label: 'Total Applied', value: stats.total, trend: '+12%', icon: Briefcase, color: 'text-text-primary', bg: 'bg-bg-elevated' },
              { label: 'Active Progress', value: stats.active, trend: '+3', icon: Users, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
              { label: 'Interviews', value: stats.interviews, trend: 'New', icon: CheckCircle2, color: 'text-accent-secondary', bg: 'bg-accent-secondary/10' },
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

        {/* Applications Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-display font-black text-white tracking-tight uppercase">Applications</h2>
          
            {/* Tabs */}
            <div className="flex overflow-x-auto pb-2 sm:pb-0 hide-scrollbar gap-2">
              {TAB_STAGES.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                    activeTab === tab 
                    ? 'bg-bg-primary text-bg-primary' 
                    : 'bg-elevated/50 text-text-tertiary hover:text-white border border-border'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Applications List */}
          {isLoading ? (
            <div className="space-y-4">
               {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl bg-bg-card border border-border animate-pulse" />)}
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-border rounded-3xl bg-bg-card/30 flex flex-col items-center">
               <Briefcase size={40} className="text-text-tertiary mb-4 opacity-50" />
               <h3 className="text-lg font-bold text-white tracking-tight mb-2">No applications found</h3>
               <p className="text-sm text-text-secondary">You haven't reached this stage for any jobs yet.</p>
            </div>
          ) : (
            <motion.div variants={containerAnimations} initial="hidden" animate="show" className="space-y-4">
              {filteredApplications.map(app => {
                const isExpanded = expandedId === app._id;
                const job = app.job;
                const companyName = job.company?.name || job.postedBy?.company || 'Confidential';

                return (
                  <motion.div key={app._id} variants={itemAnimations}>
                    <Card className="overflow-hidden border-border transition-all hover:border-border/80">
                      <div 
                        className="p-6 cursor-pointer flex flex-col lg:flex-row gap-6 lg:items-center justify-between bg-bg-card"
                        onClick={() => setExpandedId(isExpanded ? null : app._id)}
                      >
                        {/* Left section: Job info */}
                        <div className="flex items-start gap-4">
                           <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center border border-border flex-shrink-0">
                              <Building size={20} className="text-text-tertiary" />
                           </div>
                           <div className="space-y-2 mt-1">
                              <div className="flex gap-3 items-center">
                                 <h3 className="text-lg font-black text-white leading-tight">{job.title}</h3>
                                 <Badge variant={app.stage} className="uppercase px-2 py-0.5 text-[9px]">{app.stage}</Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-text-tertiary">
                                 <span className="text-text-secondary">{companyName}</span>
                                 <span className="w-1 h-1 rounded-full bg-border" />
                                 <span className="flex items-center gap-1"><MapPin size={12}/> {job.location}</span>
                                 <span className="w-1 h-1 rounded-full bg-border" />
                                 <span>Applied {format(new Date(app.createdAt), 'MMM d, yyyy')}</span>
                              </div>
                           </div>
                        </div>

                        {/* Right section: Stepper & Expand */}
                        <div className="flex flex-col sm:flex-row lg:items-center gap-6 lg:gap-12 w-full lg:w-auto mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-none border-border">
                           <div className="hidden sm:block lg:w-48 xl:w-64">
                              {renderStepper(app.stage)}
                           </div>
                           
                           <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-auto w-full">
                              {['rejected', 'withdrawn', 'offer'].includes(app.stage) ? null : (
                                 <Button 
                                   size="sm" 
                                   variant="ghost" 
                                   onClick={(e) => { e.stopPropagation(); handleWithdraw(app._id); }}
                                   className="text-text-tertiary hover:text-accent-danger hover:bg-accent-danger/10 px-0 sm:px-3 text-xs"
                                 >
                                    Withdraw
                                 </Button>
                              )}
                              <button className="p-2 rounded-full hover:bg-bg-secondary text-text-secondary transition-colors">
                                 {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </button>
                           </div>
                        </div>
                      </div>

                      {/* Expanded Stage History */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border bg-bg-secondary/30"
                          >
                            <div className="p-6 pl-8 lg:pl-24 space-y-6">
                               <h4 className="text-xs font-black uppercase tracking-widest text-text-secondary">Application Timeline</h4>
                               <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:to-transparent">
                                  {[...(app.stageHistory || [])].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((history: any, idx: number) => (
                                     <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-5 h-5 rounded-full border border-bg-card bg-accent-primary text-bg-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ml-[-9px] md:ml-0 z-10">
                                           <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        </div>
                                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-4 md:ml-0 bg-bg-card p-4 rounded-xl border border-border">
                                           <div className="flex items-center justify-between mb-1">
                                              <Badge variant={history.stage} className="uppercase text-[9px] px-2 py-0.5">{history.stage}</Badge>
                                              <span className="text-xs font-bold text-text-tertiary">{format(new Date(history.date), 'MMM d, h:mm a')}</span>
                                           </div>
                                           <p className="text-sm text-text-secondary mt-2">{history.note}</p>
                                        </div>
                                     </div>
                                  ))}
                               </div>
                               <div className="flex justify-end pt-4">
                                  <Link href={`/jobs/${job._id}`}>
                                     <Button variant="outline" size="sm" className="text-xs gap-2 border-border text-white hover:border-accent-primary">
                                        View Job Listing <ArrowUpRight size={14} />
                                     </Button>
                                  </Link>
                               </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
