'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardUserPanel from '@/components/layout/DashboardUserPanel';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users?limit=50&page=1');
      const list = res?.data?.data || [];
      setUsers(list);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const toggleStatus = async (id: string) => {
    try {
      const res = await api.patch(`/api/users/${id}/status`);
      const updated = res?.data?.data;
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
      toast.success('User status updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      const res = await api.patch(`/api/users/${id}/role`, { role });
      const updated = res?.data?.data;
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
      toast.success('User role updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change role');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user? This action can be permanent.')) return;
    try {
      await api.delete(`/api/users/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast.success('User deleted');
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-display font-black text-white">Admin — Users</h1>
          <div className="flex items-center gap-3">
            <Badge variant="default">Total: {users.length}</Badge>
            <DashboardUserPanel />
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-text-tertiary">Loading users...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-left">
                  <thead>
                    <tr className="text-sm text-text-tertiary">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Active</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-t border-border/40">
                        <td className="px-3 py-3">{u.firstName} {u.lastName}</td>
                        <td className="px-3 py-3 text-sm text-text-secondary">{u.email}</td>
                        <td className="px-3 py-3">{u.role}</td>
                        <td className="px-3 py-3">{u.isActive ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-3 flex gap-2">
                          <Button size="sm" onClick={() => toggleStatus(u._id)}>
                            Toggle
                          </Button>
                          <Button size="sm" onClick={() => changeRole(u._id, 'recruiter')}>Make Recruiter</Button>
                          <Button size="sm" onClick={() => changeRole(u._id, 'jobseeker')}>Make Jobseeker</Button>
                          <Button size="sm" variant="danger" onClick={() => deleteUser(u._id)}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
