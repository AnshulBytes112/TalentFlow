'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

interface DashboardUserPanelProps {
  className?: string;
}

const DashboardUserPanel = ({ className }: DashboardUserPanelProps) => {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const unreadRes = await api.get('/api/notifications/unread-count');
        const unread = unreadRes?.data?.data?.count || 0;
        setUnreadCount(unread);
      } catch (error) {
        setUnreadCount(0);
      }
    };

    if (session?.user?.accessToken) {
      void loadUnreadCount();
    }
  }, [session?.user?.accessToken]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (event.target instanceof Node && !panelRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('flex min-w-0 items-center justify-end gap-3', className)}>
      <Link
        href="/notifications"
        aria-label="Open notifications"
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-elevated/40 text-text-secondary transition-all duration-300 hover:border-accent-primary/40 hover:text-accent-primary"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-primary px-1 text-[10px] font-black text-bg-primary ring-2 ring-bg-primary">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>

      <div className="relative min-w-0" ref={panelRef}>
        <button
          type="button"
          onClick={() => setIsProfileOpen((prev) => !prev)}
          className="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border bg-elevated/30 p-1 pr-3 transition-all duration-300 hover:border-accent-primary/30"
        >
          <div className="rounded-full border border-border p-1">
            <Avatar initials={session?.user?.name?.substring(0, 2) || 'U'} size="sm" />
          </div>
          <span className="truncate text-sm font-bold text-text-primary max-w-[140px]">
            {session?.user?.name || 'User'}
          </span>
          <ChevronDown
            size={14}
            className={cn('shrink-0 text-text-tertiary transition-transform', isProfileOpen && 'rotate-180')}
          />
        </button>

        {isProfileOpen && (
          <div className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-bg-card p-2 shadow-2xl">
            <div className="border-b border-border/50 px-2 py-2">
              <p className="break-all text-xs text-text-tertiary">{session?.user?.email}</p>
            </div>
            <Link
              href="/profile"
              className="mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-elevated/50 hover:text-accent-primary"
              onClick={() => setIsProfileOpen(false)}
            >
              <User size={16} />
              Profile
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(false);
                void signOut();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-accent-danger transition-colors hover:bg-accent-danger/10"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardUserPanel;
