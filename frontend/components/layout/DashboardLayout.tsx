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
  Settings, 
  LogOut, 
  ChevronLeft, 
  Search,
  PlusCircle,
  Bell
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
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Browse Jobs', href: '/jobs', icon: Search },
      { label: 'My Applications', href: '/dashboard/applications', icon: FileText },
      { label: 'Profile', href: '/dashboard/profile', icon: User },
    ],
    recruiter: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'My Jobs', href: '/dashboard/jobs', icon: Briefcase },
      { label: 'Applications Pipeline', href: '/dashboard/pipeline', icon: Users },
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { label: 'Profile', href: '/dashboard/profile', icon: User },
    ],
    admin: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Users', href: '/dashboard/admin/users', icon: Users },
      { label: 'Jobs', href: '/dashboard/admin/jobs', icon: Briefcase },
      { label: 'Applications', href: '/dashboard/admin/applications', icon: FileText },
      { label: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
    ],
  };

  const currentNav = navItems[role as keyof typeof navItems] || navItems.jobseeker;

  return (
    <div className="flex min-h-screen bg-bg-primary">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="fixed left-0 top-0 bottom-0 z-40 bg-bg-secondary border-r border-border flex flex-col pt-24 pb-6 px-4"
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
            const isActive = pathname === item.href;
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
        "flex-1 transition-all duration-300 min-h-screen",
        isCollapsed ? "pl-20" : "pl-[280px]"
      )}>
        <div className="pt-24 p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
