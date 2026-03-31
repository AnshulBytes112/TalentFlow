'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { 
  Users, 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight,
  Filter
} from 'lucide-react';
import axios from 'axios';

export default function RecruiterDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/analytics/recruiter');
        setStats(response.data.data);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) fetchStats();
  }, [session]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="screening" className="px-3 py-1 text-[10px] uppercase font-black tracking-widest bg-accent-primary/10 text-accent-primary border-none">
              Recruiter Ecosystem
            </Badge>
            <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-none">
              Welcome back, <span className="text-accent-primary italic">{session?.user?.name?.split(' ')[0]}</span>.
            </h1>
            <p className="text-text-secondary font-medium tracking-tight">
              Your hiring pipeline is active and performing at peak efficiency.
            </p>
          </div>
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-elevated/50 border border-border text-sm font-bold text-text-secondary hover:text-text-primary transition-all">
                <Filter size={16} /> Filters
             </button>
             <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-primary text-bg-primary text-sm font-black hover:shadow-[0_0_20px_rgba(110,231,183,0.4)] transition-all">
                Download Report
             </button>
          </div>
        </header>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            { label: 'Active Jobs', value: stats?.activeJobs || '12', icon: Briefcase, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
            { label: 'Total Applicants', value: stats?.totalApplicants || '458', icon: Users, color: 'text-accent-secondary', bg: 'bg-accent-secondary/10' },
            { label: 'Interviews Prep', value: '24', icon: Clock, color: 'text-accent-warning', bg: 'bg-accent-warning/10' },
            { label: 'Offers Sent', value: '8', icon: CheckCircle2, color: 'text-luxury', bg: 'bg-luxury/10' },
          ].map((stat, idx) => (
            <motion.div key={idx} variants={item}>
              <Card className="hover:border-accent-primary/30 transition-colors cursor-pointer group h-full">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                      <stat.icon size={24} />
                    </div>
                    <ArrowUpRight size={20} className="text-text-tertiary group-hover:text-text-primary transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-display font-black text-white font-mono">{stat.value}</div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-text-tertiary">{stat.label}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Existing Layout Elements */}
        <div className="grid lg:grid-cols-3 gap-8">
           <Card className="lg:col-span-2 border-border transition-all">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-display font-black uppercase tracking-tight text-white">Recent Activity</CardTitle>
                <button className="text-xs font-bold text-accent-primary hover:underline">View All</button>
              </CardHeader>
              <CardContent className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-elevated/20 border border-border/50 hover:border-border transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center border border-border">
                        <Briefcase size={20} className="text-accent-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-primary">New Application Received</h4>
                        <p className="text-xs text-text-tertiary">Senior Full Stack Engineer • Just now</p>
                      </div>
                    </div>
                    <Badge variant={i % 2 === 0 ? 'offer' : 'applied'} className="text-[9px]">
                       {i % 2 === 0 ? 'HIGH PRIORITY' : 'NEW'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
           </Card>

           <Card className="bg-gradient-to-br from-bg-card to-accent-primary/5 border-border">
              <CardHeader>
                <CardTitle className="text-xl font-display font-black uppercase tracking-tight text-white">Elite Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                   <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                         <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-elevated" />
                         <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={Math.PI * 2 * 58} strokeDashoffset={Math.PI * 2 * 58 * 0.25} className="text-accent-primary" />
                      </svg>
                      <div className="absolute text-3xl font-display font-black text-white">75%</div>
                   </div>
                   <p className="text-sm text-text-secondary font-medium px-4">
                      Your response time is 15% faster than last month.
                   </p>
                </div>
                <button className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-bg-primary text-white border border-border hover:border-accent-primary transition-all rounded-xl">
                   Optimize Performance
                </button>
              </CardContent>
           </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
