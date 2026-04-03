'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, LogOut, ChevronDown, Menu, CheckSquare } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface UINotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: string;
  data?: {
    url?: string;
    actionText?: string;
  };
}


const Navbar = () => {
  const { data: session, status } = useSession();
  const accessToken = session?.user?.accessToken;
  const { unreadCount, notifications, setNotifications, markAllRead: markAllReadInStore } = useNotifications();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasLoadedNotificationList, setHasLoadedNotificationList] = useState(false);

  const notificationsHref = '/notifications';

  const mapNotification = (n: any): UINotification => ({
    _id: n._id || n.id,
    title: n.title || 'Notification',
    message: n.message || '',
    type: n.type || 'system',
    status: n.status || 'unread',
    createdAt: n.createdAt || new Date().toISOString(),
    data: n.data || {},
  });

  const loadNotificationList = async () => {
    try {
      const listRes = await api.get('/api/notifications?limit=5&page=1');

      const list = listRes?.data?.data?.notifications || [];

      setNotifications(list.map(mapNotification));
      setHasLoadedNotificationList(true);
    } catch (error) {
      // Silent fallback: navbar should still render if notifications endpoint fails.
      setNotifications([]);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      markAllReadInStore();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  useEffect(() => {
    if (!accessToken) {
      setHasLoadedNotificationList(false);
      setNotifications([]);
      return;
    }

    setHasLoadedNotificationList(false);
  }, [accessToken]);

  useEffect(() => {
    if (!isNotifOpen || !accessToken || hasLoadedNotificationList) {
      return;
    }

    void loadNotificationList();
  }, [isNotifOpen, accessToken, hasLoadedNotificationList]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b',
      isScrolled 
        ? 'bg-bg-primary/80 backdrop-blur-xl border-border py-3 shadow-2xl' 
        : 'bg-transparent border-transparent py-5'
    )}>
      <div className="container flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform duration-500">
            <span className="font-display font-black text-bg-primary text-xl">T</span>
          </div>
          <span className="font-display font-black text-2xl tracking-tight text-luxury">TalentFlow</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {status === 'loading' ? (
            <div className="w-20 h-8 bg-elevated/50 animate-pulse rounded-lg" />
          ) : session ? (
            <div className="flex items-center gap-6">
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2.5 rounded-xl bg-elevated/50 hover:bg-elevated border border-border text-text-secondary hover:text-accent-primary transition-all duration-300"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-accent-primary text-bg-primary text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-bg-primary">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-80 bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl"
                    >
                      <div className="p-4 border-b border-border flex items-center justify-between">
                        <h4 className="font-display font-bold text-text-primary">Notifications</h4>
                        <button
                          onClick={markAllRead}
                          className="text-xs text-accent-primary hover:underline flex items-center gap-1 font-semibold"
                        >
                          <CheckSquare size={12} /> Mark all read
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 && (
                          <div className="p-4 text-xs text-text-tertiary">No notifications yet.</div>
                        )}
                        {notifications.map(n => (
                          <div key={n._id} className={cn(
                            "p-4 border-b border-border/50 hover:bg-elevated/30 transition-colors cursor-pointer group",
                            n.status === 'unread' && "bg-accent-primary/5"
                          )}>
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-bold text-text-primary group-hover:text-accent-primary transition-colors">{n.title}</span>
                              <span className="text-[10px] text-text-tertiary font-mono">
                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-text-secondary leading-relaxed">{n.message}</p>
                          </div>
                        ))}
                      </div>
                      <Link href={notificationsHref} className="block p-3 text-center text-xs text-text-tertiary hover:text-text-primary transition-colors hover:bg-elevated/50 font-bold">
                        View all notifications
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button 
                          onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 p-1 pr-3 rounded-full bg-elevated/30 border border-border hover:border-accent-primary/30 transition-all duration-300"
                >
                  <Avatar initials={session.user?.name?.substring(0, 2) || 'JD'} size="sm" />
                  <span className="text-sm font-bold text-text-primary hidden lg:block">{session.user?.name}</span>
                  <ChevronDown size={14} className={cn("text-text-tertiary transition-transform", isProfileOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-56 bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-2"
                    >
                      <div className="px-3 py-2 border-b border-border/50 mb-1">
                         <Badge variant="applied" className="mb-1 text-[10px] uppercase tracking-wider font-black">
                            {session.user?.role || 'Jobseeker'}
                         </Badge>
                         <p className="text-xs text-text-tertiary truncate">{session.user?.email}</p>
                      </div>
                      <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-text-secondary hover:text-accent-primary hover:bg-accent-primary/5 rounded-xl transition-all group">
                        <User size={18} className="text-text-tertiary group-hover:text-accent-primary transition-colors" /> My Profile
                      </Link>
                      <button 
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-accent-danger hover:bg-accent-danger/5 rounded-xl transition-all group"
                      >
                        <LogOut size={18} className="transition-transform group-hover:translate-x-1" /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
                Log In
              </Link>
              <Link href="/register">
                <Button size="md" className="font-bold tracking-tight">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button className="md:hidden p-2.5 rounded-xl bg-elevated/50 text-text-primary">
          <Menu size={24} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
