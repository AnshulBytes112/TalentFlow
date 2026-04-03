'use client';

import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

type AdminAnalyticsData = {
  newUsersLast30Days?: Array<{ _id: string; count: number }>;
  newUsersLast30DaysByRole?: Array<{ _id: { date: string; role: string }; count: number }>;
  applicationsLast30Days?: Array<{ _id: string; count: number }>;
  topRecruiters?: Array<{ name: string; company?: string; applicationCount: number }>;
  topSkillsInDemand?: Array<{ _id: string; count: number }>;
};

const COLORS = ['#6EE7B7', '#60A5FA', '#F59E0B', '#F87171', '#A78BFA', '#34D399'];

const formatLabel = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const chartTooltipStyle = {
  background: '#0F172A',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '12px',
  color: '#E2E8F0',
};

const AdminAnalyticsCharts = ({ data }: { data: AdminAnalyticsData }) => {
  const newUsersTrend = useMemo(() => {
    const map = new Map<string, { date: string; jobseeker: number; recruiter: number }>();

    data.newUsersLast30Days?.forEach((entry) => {
      map.set(entry._id, {
        date: entry._id,
        jobseeker: 0,
        recruiter: 0,
      });
    });

    data.newUsersLast30DaysByRole?.forEach((entry) => {
      const date = entry._id.date;
      const next = map.get(date) || { date, jobseeker: 0, recruiter: 0 };
      if (entry._id.role === 'jobseeker') next.jobseeker = entry.count;
      if (entry._id.role === 'recruiter') next.recruiter = entry.count;
      map.set(date, next);
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const applicationsTrend = useMemo(
    () => (data.applicationsLast30Days || []).map((entry) => ({ date: entry._id, count: entry.count })),
    [data]
  );

  const recruiters = useMemo(
    () => (data.topRecruiters || []).map((entry) => ({
      name: entry.name,
      label: entry.company || 'Recruiter',
      count: entry.applicationCount,
    })),
    [data]
  );

  const skills = useMemo(
    () => (data.topSkillsInDemand || []).map((entry) => ({
      name: entry._id,
      count: entry.count,
    })),
    [data]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="min-h-[360px]">
        <CardHeader>
          <CardTitle>New Users Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={newUsersTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
              <XAxis dataKey="date" tickFormatter={formatLabel} stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip contentStyle={chartTooltipStyle} labelFormatter={formatLabel} />
              <Legend />
              <Line type="monotone" dataKey="jobseeker" stroke="#6EE7B7" strokeWidth={3} dot={false} name="Jobseekers" />
              <Line type="monotone" dataKey="recruiter" stroke="#60A5FA" strokeWidth={3} dot={false} name="Recruiters" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="min-h-[360px]">
        <CardHeader>
          <CardTitle>Applications Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={applicationsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
              <XAxis dataKey="date" tickFormatter={formatLabel} stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip contentStyle={chartTooltipStyle} labelFormatter={formatLabel} />
              <Area type="monotone" dataKey="count" stroke="#6EE7B7" fill="rgba(110, 231, 183, 0.18)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="min-h-[360px]">
        <CardHeader>
          <CardTitle>Top Recruiters by Activity</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={recruiters} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
              <XAxis type="number" stroke="#94A3B8" fontSize={12} />
              <YAxis type="category" dataKey="name" width={120} stroke="#94A3B8" fontSize={12} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                {recruiters.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="min-h-[360px]">
        <CardHeader>
          <CardTitle>Skills in Demand</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={skills} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
              <XAxis type="number" stroke="#94A3B8" fontSize={12} />
              <YAxis type="category" dataKey="name" width={120} stroke="#94A3B8" fontSize={12} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                {skills.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalyticsCharts;
