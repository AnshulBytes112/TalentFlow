'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  Calendar,
  BarChart3,
  Activity
} from 'lucide-react';
import api from '@/lib/axios';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'react-hot-toast';

interface AnalyticsData {
  totalApplications: number;
  conversionRate: number;
  avgTimeToHire: number;
  activeJobViews: number;
  applicationsOverTime: Array<{ date: string; count: number }>;
  applicationsByStage: Array<{ stage: string; count: number }>;
  topJobs: Array<{ title: string; count: number }>;
  skillsDemand: Array<{ skill: string; count: number }>;
}

const DATE_RANGES = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 }
];

const CHART_COLORS = {
  primary: '#6EE7B7',
  secondary: '#3B82F6',
  tertiary: '#FBBF24',
  danger: '#F87171',
  luxury: '#F59E0B'
};

const STAGE_COLORS = {
  applied: '#6EE7B7',
  screening: '#3B82F6',
  interview: '#FBBF24',
  offer: '#F59E0B',
  rejected: '#F87171'
};

export default function RecruiterAnalyticsPage() {
  const { data: session } = useSession();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/analytics/recruiter?days=${dateRange}`);
      setAnalyticsData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics data', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchAnalyticsData();
  }, [session, dateRange]);

  const kpiData = useMemo(() => [
    {
      label: 'Total Applications',
      value: analyticsData?.totalApplications || 0,
      icon: Users,
      color: 'text-accent-primary',
      bg: 'bg-accent-primary/10',
      trend: '+12%'
    },
    {
      label: 'Conversion Rate',
      value: `${analyticsData?.conversionRate || 0}%`,
      icon: TrendingUp,
      color: 'text-accent-secondary',
      bg: 'bg-accent-secondary/10',
      trend: '+5%'
    },
    {
      label: 'Avg Time to Hire',
      value: `${analyticsData?.avgTimeToHire || 0} days`,
      icon: Clock,
      color: 'text-accent-warning',
      bg: 'bg-accent-warning/10',
      trend: '-3 days'
    },
    {
      label: 'Active Job Views',
      value: analyticsData?.activeJobViews || 0,
      icon: Activity,
      color: 'text-luxury',
      bg: 'bg-luxury/10',
      trend: '+18%'
    }
  ], [analyticsData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white mb-1">
            {label}
          </p>
          <p className="text-sm text-accent-primary">
            {payload[0].value} applications
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white mb-1">
            {label}
          </p>
          <p className="text-sm text-accent-primary">
            {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <Card key={i} className="h-32">
                <CardContent className="p-6">
                  <div className="h-20 bg-bg-secondary animate-pulse rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1,2].map(i => (
              <Card key={i} className="h-80">
                <CardContent className="p-6">
                  <div className="h-64 bg-bg-secondary animate-pulse rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="screening" className="px-3 py-1 text-[10px] uppercase font-black tracking-widest bg-accent-primary/10 text-accent-primary border-none">
              Analytics Dashboard
            </Badge>
            <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-none">
              Hiring Analytics
            </h1>
            <p className="text-text-secondary font-medium tracking-tight">
              Track your recruitment performance and optimize hiring strategy.
            </p>
          </div>
          
          {/* Date Range Selector */}
          <div className="flex gap-2">
            {DATE_RANGES.map(range => (
              <Button
                key={range.value}
                variant={dateRange === range.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(range.value)}
                className="px-4 py-2"
              >
                {range.label}
              </Button>
            ))}
          </div>
        </header>

        {/* KPI Cards - Row 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {kpiData.map((kpi, idx) => (
            <Card key={idx} className="border-border hover:border-border/80 transition-colors">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
                    <kpi.icon size={20} />
                  </div>
                  <Badge variant="default" className="text-[10px] px-2 py-1 bg-accent-primary/10 text-accent-primary border-accent-primary/20">
                    {kpi.trend}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-display font-black text-white font-mono">{kpi.value}</div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">{kpi.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Charts - Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Applications Over Time */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-display font-black uppercase tracking-tight text-white">
                  Applications Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData?.applicationsOverTime || []}>
                    <defs>
                      <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94A3B8"
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#94A3B8"
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorApplications)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Applications by Stage */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-display font-black uppercase tracking-tight text-white">
                  Applications by Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.applicationsByStage || []} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis 
                      type="number" 
                      stroke="#94A3B8"
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="stage" 
                      stroke="#94A3B8"
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {(analyticsData?.applicationsByStage || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STAGE_COLORS[entry.stage as keyof typeof STAGE_COLORS]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts - Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Jobs by Applications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-display font-black uppercase tracking-tight text-white">
                  Top 5 Jobs by Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.topJobs || []} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis 
                      type="number" 
                      stroke="#94A3B8"
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="title" 
                      stroke="#94A3B8"
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      width={120}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={CHART_COLORS.secondary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Skills in Demand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-display font-black uppercase tracking-tight text-white">
                  Skills in Demand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.skillsDemand || []} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis 
                      type="number" 
                      stroke="#94A3B8"
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="skill" 
                      stroke="#94A3B8"
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      width={120}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={CHART_COLORS.tertiary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-border bg-gradient-to-br from-bg-card to-accent-primary/5">
            <CardHeader>
              <CardTitle className="text-lg font-display font-black uppercase tracking-tight text-white">
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-primary mb-2">
                    {((analyticsData?.conversionRate || 0) * 2).toFixed(1)}%
                  </div>
                  <div className="text-sm text-text-secondary">
                    Above industry average conversion rate
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-secondary mb-2">
                    {analyticsData?.avgTimeToHire || 0} days
                  </div>
                  <div className="text-sm text-text-secondary">
                    Average time from application to hire
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-warning mb-2">
                    {analyticsData?.totalApplications || 0}
                  </div>
                  <div className="text-sm text-text-secondary">
                    Total applications in selected period
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
