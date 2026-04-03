'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardUserPanel from '@/components/layout/DashboardUserPanel';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { Search, Trash2, ToggleLeft, UserRound, Users, Filter } from 'lucide-react';

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  profile?: {
    avatarUrl?: string;
    companyName?: string;
    bio?: string;
    location?: string;
    phone?: string;
  };
};

type ConfirmState =
  | { type: 'toggle'; user: User }
  | { type: 'delete'; user: User }
  | { type: 'bulk-deactivate' }
  | null;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users?limit=100&page=1');
      const list = res?.data?.data || [];
      setUsers(list);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const matchesSearch = !query || fullName.includes(query) || user.email.toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedIds.includes(user._id)),
    [users, selectedIds]
  );

  const toggleSelection = (userId: string) => {
    setSelectedIds((prev) => (
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    ));
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredUsers.map((user) => user._id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const toggleStatus = async (userId: string) => {
    try {
      const res = await api.patch(`/api/users/${userId}/status`);
      const updated = res?.data?.data;
      setUsers((prev) => prev.map((user) => (user._id === updated._id ? updated : user)));
      toast.success('User status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const changeRole = async (userId: string, role: string) => {
    try {
      const res = await api.patch(`/api/users/${userId}/role`, { role });
      const updated = res?.data?.data;
      setUsers((prev) => prev.map((user) => (user._id === updated._id ? updated : user)));
      toast.success('User role updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to change role');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await api.delete(`/api/users/${userId}`);
      setUsers((prev) => prev.filter((user) => user._id !== userId));
      setSelectedIds((prev) => prev.filter((id) => id !== userId));
      toast.success('User deleted');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const bulkDeactivate = async () => {
    const targets = selectedUsers.filter((user) => user.isActive);
    try {
      await Promise.all(targets.map((user) => api.patch(`/api/users/${user._id}/status`)));
      toast.success(`${targets.length} user${targets.length === 1 ? '' : 's'} deactivated`);
      await loadUsers();
    } catch (error) {
      toast.error('Failed to deactivate selected users');
    }
  };

  const confirmAction = async () => {
    if (!confirmState) return;

    if (confirmState.type === 'toggle') {
      await toggleStatus(confirmState.user._id);
    }

    if (confirmState.type === 'delete') {
      await deleteUser(confirmState.user._id);
    }

    if (confirmState.type === 'bulk-deactivate') {
      await bulkDeactivate();
    }

    setConfirmState(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-black text-white">Admin — Users</h1>
            <p className="text-text-secondary">Search, filter, and manage the user base.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="default">Total: {users.length}</Badge>
            <Badge variant="applied">Visible: {filteredUsers.length}</Badge>
            <DashboardUserPanel />
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={18} />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(3,minmax(0,180px))]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                <Input
                  label="Search users"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email"
                  className="pl-10"
                />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg-secondary px-10 py-3 text-sm text-white outline-none focus:border-accent-primary"
                >
                  <option value="all">All Roles</option>
                  <option value="jobseeker">Jobseeker</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-border bg-bg-secondary px-4 py-3 text-sm text-white outline-none focus:border-accent-primary"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <Button
                variant="secondary"
                disabled={selectedIds.length === 0}
                onClick={() => setConfirmState({ type: 'bulk-deactivate' })}
              >
                Deactivate selected ({selectedIds.length})
              </Button>
            </div>

            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filteredUsers.length > 0 && filteredUsers.every((user) => selectedIds.includes(user._id))}
                  onChange={toggleAllVisible}
                />
                Select visible
              </label>
              <span>Selected: {selectedIds.length}</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-20 rounded-2xl bg-bg-secondary/60 animate-pulse" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-bg-secondary/30 px-6 py-16 text-center">
                <UserRound size={40} className="text-text-tertiary/60" />
                <div>
                  <h3 className="text-lg font-bold text-white">No matching users</h3>
                  <p className="text-sm text-text-tertiary">Adjust the search or filters to see users.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const isSelected = selectedIds.includes(user._id);
                  return (
                    <div key={user._id} className={`rounded-2xl border p-4 transition-colors ${isSelected ? 'border-accent-primary/40 bg-accent-primary/5' : 'border-border bg-bg-secondary/20'}`}>
                      <div className="grid gap-4 xl:grid-cols-[auto_1.25fr_1fr_0.8fr_auto] xl:items-center">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(user._id)} />
                          <Avatar
                            src={user.profile?.avatarUrl}
                            initials={`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()}
                            size="md"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-white">{user.firstName} {user.lastName}</p>
                          <p className="truncate text-sm text-text-secondary">{user.profile?.companyName || 'No company profile'}</p>
                        </div>

                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm text-text-secondary">{user.email}</p>
                          <p className="text-xs text-text-tertiary">Joined {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'recently'}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={user.role === 'admin' ? 'offer' : user.role === 'recruiter' ? 'screening' : 'applied'} className="capitalize">
                            {user.role}
                          </Badge>
                          <Badge variant={user.isActive ? 'applied' : 'rejected'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setProfileUser(user)}>
                            View Profile
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmState({ type: 'toggle', user })}>
                            <ToggleLeft size={14} className="mr-1" />
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <select
                            value={user.role}
                            disabled={user.role === 'admin'}
                            onChange={(e) => changeRole(user._id, e.target.value)}
                            className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white outline-none disabled:opacity-50"
                          >
                            <option value="jobseeker">Jobseeker</option>
                            <option value="recruiter">Recruiter</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button variant="danger" size="sm" onClick={() => setConfirmState({ type: 'delete', user })}>
                            <Trash2 size={14} className="mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.type === 'bulk-deactivate' ? 'Deactivate selected users' : 'Confirm action'}
        description={confirmState?.type === 'delete'
          ? `Delete ${confirmState.user.firstName} ${confirmState.user.lastName}? This cannot be undone.`
          : confirmState?.type === 'toggle'
            ? `${confirmState.user.isActive ? 'Deactivate' : 'Activate'} ${confirmState.user.firstName} ${confirmState.user.lastName}?`
            : 'Deactivate all selected active users.'}
      >
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmState(null)}>Cancel</Button>
          <Button variant={confirmState?.type === 'delete' ? 'danger' : 'primary'} onClick={() => void confirmAction()}>
            Confirm
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!profileUser}
        onClose={() => setProfileUser(null)}
        title="User Profile"
        description={profileUser ? `${profileUser.firstName} ${profileUser.lastName}` : ''}
        maxWidth="lg"
      >
        {profileUser && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <Avatar
                src={profileUser.profile?.avatarUrl}
                initials={`${profileUser.firstName?.[0] || ''}${profileUser.lastName?.[0] || ''}`.toUpperCase()}
                size="xl"
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">{profileUser.firstName} {profileUser.lastName}</h3>
                <p className="text-text-secondary">{profileUser.email}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default" className="capitalize">{profileUser.role}</Badge>
                  <Badge variant={profileUser.isActive ? 'applied' : 'rejected'}>{profileUser.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-bg-secondary/30 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary">Phone</p>
                <p className="mt-2 text-sm text-white">{profileUser.profile?.phone || 'Not provided'}</p>
              </div>
              <div className="rounded-2xl border border-border bg-bg-secondary/30 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary">Location</p>
                <p className="mt-2 text-sm text-white">{profileUser.profile?.location || 'Not provided'}</p>
              </div>
            </div>

            {profileUser.profile?.bio && (
              <div className="rounded-2xl border border-border bg-bg-secondary/30 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary">Bio</p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{profileUser.profile.bio}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
