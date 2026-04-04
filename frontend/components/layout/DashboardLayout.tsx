'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  User, 
  BarChart3, 
  Users, 
  LogOut, 
  ChevronLeft, 
  Search,
  PlusCircle,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const role = session?.user?.role || 'jobseeker';

  const navItems: Record<string, NavItem[]> = {
    jobseeker: [
      { label: 'Overview', href: '/jobseeker', icon: LayoutDashboard },
      { label: 'Browse Jobs', href: '/jobs', icon: Search },
      { label: 'My Applications', href: '/jobseeker/applications', icon: FileText },
      { label: 'Profile', href: '/profile', icon: User },
    ],
    recruiter: [
      { label: 'Overview', href: '/recruiter', icon: LayoutDashboard },
      { label: 'My Jobs', href: '/recruiter/jobs', icon: Briefcase },
      { label: 'Post Job', href: '/recruiter/jobs/new', icon: PlusCircle },
      { label: 'Pipeline', href: '/recruiter/pipeline', icon: Users },
      { label: 'Analytics', href: '/recruiter/analytics', icon: BarChart3 },
      { label: 'Profile', href: '/profile', icon: User },
    ],
    admin: [
      { label: 'Overview', href: '/admin', icon: LayoutDashboard },
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Jobs', href: '/admin/jobs', icon: Briefcase },
      { label: 'Applications', href: '/admin/applications', icon: FileText },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  };

  const currentNav = navItems[role as keyof typeof navItems] || navItems.jobseeker;

  return (
    <div className="flex min-h-screen overflow-x-clip bg-bg-primary">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="fixed left-0 top-0 bottom-0 z-40 hidden bg-bg-secondary border-r border-border flex-col pt-24 pb-6 px-4 md:flex"
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-28 w-6 h-6 bg-accent-primary rounded-full flex items-center justify-center text-bg-primary hover:scale-110 transition-transform shadow-xl shadow-accent-primary/20 z-50"
        >
          <ChevronLeft size={14} className={cn("transition-transform duration-300", isCollapsed && "rotate-180")} />
        </button>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2">
          {currentNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-3 font-bold rounded-xl transition-all group overflow-hidden",
                  isActive 
                    ? "text-accent-primary bg-accent-primary/5" 
                    : "text-text-secondary hover:text-text-primary hover:bg-elevated/50"
                )}
              >
                {/* Active Indicator Bar */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-accent-primary rounded-r-full"
                    />
                  )}
                </AnimatePresence>

                <item.icon size={22} className={cn("transition-colors", isActive ? "text-accent-primary" : "text-text-tertiary group-hover:text-text-primary")} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className={cn(
          "mt-auto pt-6 border-t border-border space-y-4",
          isCollapsed ? "items-center" : ""
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-2 mb-4">
              <Avatar initials={session?.user?.name?.substring(0, 2) || 'U'} size="sm" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-text-primary truncate">{session?.user?.name || 'User'}</span>
                <Badge variant="applied" className="w-fit text-[9px] px-1.5 py-0">
                  {role.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}
          
          {isCollapsed && (
             <div className="flex justify-center mb-4">
                <Avatar initials={session?.user?.name?.substring(0, 2) || 'U'} size="sm" />
             </div>
          )}

          <button
            onClick={() => signOut()}
            className={cn(
               "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-accent-danger hover:bg-accent-danger/5 rounded-xl transition-all group",
               isCollapsed ? "justify-center" : ""
            )}
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 min-h-screen overflow-x-hidden pb-24 transition-all duration-300 md:pb-0",
        isCollapsed ? "pl-0 md:pl-20" : "pl-0 md:pl-[280px]"
      )}>
        <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <nav className="fixed bottom-4 left-4 right-4 z-40 grid grid-cols-4 gap-2 rounded-3xl border border-border bg-bg-secondary/95 p-2 shadow-2xl backdrop-blur-xl md:hidden">
        {currentNav.slice(0, 4).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors',
                isActive ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-tertiary'
              )}
            >
              <item.icon size={18} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default DashboardLayout;
