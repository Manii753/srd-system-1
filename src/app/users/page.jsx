'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  PlusCircle, Edit, Trash2, UserCheck, UserX, 
  Mail, Shield, Calendar, Search, Key, Camera, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import UserPermissionsModal from '@/components/UserPermissionsModal';

export default function UsersManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: '',
    isActive: true
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    const isAdmin = session?.user?.role === 'admin';
    const canManage = session?.user?.permissions?.canManageUsers === true;
    if (!session || (!isAdmin && !canManage)) {
      router.push('/login');
      return;
    }

    fetchDepartments();
  }, [session, status, router]);

  useEffect(() => {
    if (status === 'loading') return;
    fetchUsers();
  }, [currentPage, searchTerm, status]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({ page: currentPage });
      if (searchTerm) query.append('search', searchTerm);
      const res = await fetch(`/api/users?${query.toString()}`);
      const usersData = await res.json();
      if (usersData.success) {
        setUsers(usersData.data);
        setTotalPages(usersData.totalPages);
        setTotalUsers(usersData.totalCount);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) setDepartments(data.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchAllData = async () => {
    await fetchUsers();
  };

  const openNewUserModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: '',
      department: '',
      isActive: true
    });
    setEditingUser(null);
    setAvatarFile(null);
    setAvatarPreview('');
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't populate password
      role: user.role,
      department: user.department || '',
      isActive: user.isActive
    });
    setEditingUser(user);
    setAvatarFile(null);
    setAvatarPreview(user.profilePicture || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // Update user
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password; // Don't update password if empty
        }

        const res = await fetch(`/api/users/${editingUser._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        const data = await res.json();
        if (data.success) {
          toast.success('User updated successfully');
          if (avatarFile) {
            await handleAvatarUpload(editingUser._id);
          }
          fetchAllData();
          setModalOpen(false);
        } else {
          toast.error(data.error || 'Failed to update user');
        }
      } else {
        // Create user
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await res.json();
        if (data.success) {
          toast.success('User created successfully');
          if (avatarFile && data.data?._id) {
            await handleAvatarUpload(data.data._id);
          }
          fetchAllData();
          setModalOpen(false);
        } else {
          toast.error(data.error || 'Failed to create user');
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('An error occurred');
    }
  };

  const handleAvatarUpload = async (userId) => {
    if (!avatarFile) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result;
        const res = await fetch(`/api/users/${userId}/avatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileData: base64Data, fileName: avatarFile.name })
        });

        const data = await res.json();
        if (data.success) {
          toast.success('Profile picture updated');
          fetchAllData();
        } else {
          toast.error(data.error || 'Failed to upload avatar');
        }
      };
      reader.readAsDataURL(avatarFile);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const res = await fetch(`/api/users/${resetPasswordUser._id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Password reset for ${resetPasswordUser.name}`);
        setResetPasswordUser(null);
        setNewPassword('');
      } else {
        toast.error(data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('An error occurred');
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.name}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (data.success) {
        toast.success('User deleted successfully');
        fetchAllData();
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('An error occurred');
    }
  };

  const toggleUserStatus = async (user) => {
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`User ${!user.isActive ? 'activated' : 'deactivated'}`);
        fetchAllData();
      } else {
        toast.error(data.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('An error occurred');
    }
  };

  const openPermissionsModal = (user) => {
    setEditingPermissionsUser(user);
    setPermissionsModalOpen(true);
  };

  const handlePermissionsUpdate = async (permissions, sidebarMenuItems) => {
    try {
      const res = await fetch(`/api/users/${editingPermissionsUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions, sidebarMenuItems })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Permissions updated successfully');
        fetchAllData();
        setPermissionsModalOpen(false);
      } else {
        toast.error(data.error || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('An error occurred');
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      vmd: 'bg-blue-100 text-blue-800',
      cad: 'bg-green-100 text-green-800',
      commercial: 'bg-yellow-100 text-yellow-800',
      mmc: 'bg-red-100 text-red-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full overflow-y-auto custom-scrollbar p-2">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-app-heading font-bold text-gray-900">User Management</h1>
              <p className="text-app-text text-gray-600 mt-1">Manage system users and permissions</p>
            </div>
            <Button onClick={openNewUserModal} className="flex items-center space-x-2">
              <PlusCircle className="h-5 w-5" />
              <span className="text-app-text">Add User</span>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-app-text font-medium">Total Users</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-app-heading font-bold">{totalUsers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-app-text font-medium">Active Users</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-app-heading font-bold">
                  {users.filter(u => u.isActive).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-app-text font-medium">Inactive Users</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-app-heading font-bold">
                  {users.filter(u => !u.isActive).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-app-text font-medium">Admins</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-app-heading font-bold">
                  {users.filter(u => u.role === 'admin').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-app-text font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                              {user.profilePicture ? (
                                <img src={user.profilePicture} alt={user.name} className="h-10 w-10 object-cover" />
                              ) : (
                                <span className="text-blue-600 font-semibold text-app-text">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-app-text font-medium text-gray-900">{user.name}</div>
                              <div className="text-app-text text-gray-500 flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`${getRoleBadgeColor(user.role)} text-app-text`}>
                            {user.role.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-app-text text-gray-500">
                          {user.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-app-text`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-app-text text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-app-text font-medium space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPermissionsModal(user)}
                            title="Manage Permissions"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setResetPasswordUser(user); setNewPassword(''); }}
                            title="Reset Password"
                            className="text-orange-600 hover:text-orange-900"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleUserStatus(user)}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-app-text text-gray-500">No users found</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end px-6 py-3 border-t gap-2">
              <span className="text-app-text text-sm text-gray-500 mr-2">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-app-text font-medium"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-app-text">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded text-app-text font-medium transition-colors ${currentPage === p
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-200 text-gray-700'
                        }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-app-text font-medium"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Modal */}
        {modalOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setModalOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h2 className="text-app-heading font-semibold">
                    {editingUser ? 'Edit User' : 'Add New User'}
                  </h2>
                  <button
                    className="text-gray-500 hover:text-gray-800 text-app-text leading-none"
                    onClick={() => setModalOpen(false)}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                  {/* Profile Picture Upload */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Preview" className="h-20 w-20 object-cover" />
                        ) : (
                          <Camera className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 cursor-pointer hover:bg-blue-700 shadow-md">
                        <Camera className="h-3.5 w-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Profile Picture</p>
                      <p className="text-xs text-gray-500">JPG, PNG. Max 2MB</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="name" className="text-app-heading">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="text-app-text"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-app-heading">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="text-app-text"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-app-heading">
                      Password {editingUser ? '(leave empty to keep current)' : '*'}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      className="text-app-text"
                    />
                  </div>

                  <div>
                    <Label htmlFor="role" className="text-app-heading">Role *</Label>
                    <select
                      id="role"
                      className="w-full p-2 border border-gray-300 rounded text-app-text"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      required
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      {departments.map(dept => (
                        <option key={dept._id} value={dept.slug}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="department" className="text-app-heading">Department (Optional)</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g., Design Team"
                      className="text-app-text"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="form-checkbox h-4 w-4"
                    />
                    <Label htmlFor="isActive" className="text-app-text">Active</Label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModalOpen(false)}
                      className="text-app-text"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="text-app-text">
                      {editingUser ? 'Update User' : 'Create User'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Permissions Modal */}
        <UserPermissionsModal
          user={editingPermissionsUser}
          isOpen={permissionsModalOpen}
          onClose={() => setPermissionsModalOpen(false)}
          onSave={handlePermissionsUpdate}
        />

        {/* Reset Password Modal */}
        {resetPasswordUser && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setResetPasswordUser(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-200">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h2 className="text-app-heading font-semibold">Reset Password</h2>
                  <button
                    className="text-gray-500 hover:text-gray-800"
                    onClick={() => setResetPasswordUser(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <p className="text-sm text-gray-600">
                    Set new password for <strong>{resetPasswordUser.name}</strong>
                  </p>
                  <Input
                    type="password"
                    placeholder="New password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <div className="flex justify-end space-x-3 pt-2">
                    <Button variant="outline" onClick={() => setResetPasswordUser(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleResetPassword}>
                      Reset Password
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>  
    </Layout>
  );
}

