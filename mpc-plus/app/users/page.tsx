'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MdKeyboardArrowDown, MdEdit, MdSave, MdCancel } from 'react-icons/md';
import { 
  fetchUser, 
  fetchUsers, 
  updateUserRole,
  getUserRolePermissions,
  updateUserRolePermissions,
  handleApiError, 
  type User,
  type UserPermissions 
} from '../../lib/api';
import { Navbar, Button } from '../../components/ui';
import { NAVIGATION } from '../../constants';

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editedRole, setEditedRole] = useState<'admin' | 'user' | null>(null);
  const [saving, setSaving] = useState(false);
  
  // User Role Permissions state
  const [userRolePermissions, setUserRolePermissions] = useState<UserPermissions | null>(null);
  const [editingPermissions, setEditingPermissions] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState<UserPermissions | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const [currentUserData, usersData, permissionsData] = await Promise.all([
          fetchUser(),
          fetchUsers(),
          getUserRolePermissions()
        ]);
        setCurrentUser(currentUserData);
        setUsers(usersData);
        setUserRolePermissions(permissionsData);
        setEditedPermissions(permissionsData);
      } catch (error) {
        const errorMessage = handleApiError(error);
        setError(errorMessage);
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditedRole(user.role);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditedRole(null);
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      setSaving(true);
      setError(null);
      const updatedUser = await updateUserRole(userId, newRole);
      
      setUsers(prevUsers => 
        prevUsers.map(u => u.id === userId ? updatedUser : u)
      );
      
      setEditedRole(newRole);
      setEditingUserId(null);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      console.error('Error updating user role:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditPermissions = () => {
    setEditingPermissions(true);
    setEditedPermissions(userRolePermissions);
  };

  const handleCancelEditPermissions = () => {
    setEditingPermissions(false);
    setEditedPermissions(userRolePermissions);
  };

  const handlePermissionChange = (permission: keyof UserPermissions, value: boolean) => {
    if (editedPermissions) {
      setEditedPermissions({
        ...editedPermissions,
        [permission]: value,
      });
    }
  };

  const handleSavePermissions = async () => {
    if (!editedPermissions) {
      return;
    }

    try {
      setSavingPermissions(true);
      setError(null);
      const updatedPermissions = await updateUserRolePermissions(editedPermissions);
      
      setUserRolePermissions(updatedPermissions);
      setEditingPermissions(false);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      console.error('Error updating user role permissions:', error);
    } finally {
      setSavingPermissions(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar user={currentUser} />
        <main className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  // Redirect non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar user={currentUser} />
        <main className="p-6">
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              You do not have permission to access User Management. Only administrators can manage users.
            </p>
            <Button onClick={() => router.push(NAVIGATION.ROUTES.HOME)}>
              Go to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar user={currentUser} />
      
      <main className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            User Management
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Manage user roles and configure permissions for the User role. Admin users have full access to all features.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Users Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Users</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Access Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => {
                    const isEditing = editingUserId === user.id;
                    const role = isEditing && editedRole ? editedRole : user.role;

                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        {/* User Name */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <div className="relative">
                              <select
                                value={role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'user')}
                                disabled={saving}
                                className="bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-lg font-medium appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                              >
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                              </select>
                              <MdKeyboardArrowDown 
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" 
                              />
                            </div>
                          ) : (
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          )}
                        </td>

                        {/* Access Level */}
                        <td className="px-6 py-4">
                          {user.role === 'admin' ? (
                            <span className="text-sm text-gray-600 font-medium">
                              Full Access
                            </span>
                          ) : (
                            <span className="text-sm text-gray-600">
                              User Role Permissions
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="inline-flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
                              >
                                <MdCancel className="w-4 h-4 mr-1" />
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(user)}
                              className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                            >
                              <MdEdit className="w-4 h-4 mr-1" />
                              Edit Role
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* User Role Permissions Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">User Role Permissions</h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure what permissions users with the "User" role have. These settings apply to all users with the User role.
              </p>
            </div>
            {!editingPermissions && (
              <Button onClick={handleStartEditPermissions}>
                <MdEdit className="w-4 h-4 mr-2" />
                Edit Permissions
              </Button>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {editingPermissions && editedPermissions ? (
              <div className="space-y-4">
                <div className="space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editedPermissions.canViewResults}
                      onChange={(e) => handlePermissionChange('canViewResults', e.target.checked)}
                      disabled={savingPermissions}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">View Results</span>
                      <p className="text-xs text-gray-500">Allow users to view MPC results and calendar</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editedPermissions.canViewMachines}
                      onChange={(e) => handlePermissionChange('canViewMachines', e.target.checked)}
                      disabled={savingPermissions}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">View Machines</span>
                      <p className="text-xs text-gray-500">Allow users to view machine information</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editedPermissions.canViewSettings}
                      onChange={(e) => handlePermissionChange('canViewSettings', e.target.checked)}
                      disabled={savingPermissions}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">View Settings</span>
                      <p className="text-xs text-gray-500">Allow users to view application settings</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editedPermissions.canManageUsers}
                      onChange={(e) => handlePermissionChange('canManageUsers', e.target.checked)}
                      disabled={savingPermissions}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Manage Users</span>
                      <p className="text-xs text-gray-500">Allow users to manage other users (not recommended)</p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                  <Button 
                    onClick={handleSavePermissions}
                    disabled={savingPermissions}
                  >
                    <MdSave className="w-4 h-4 mr-2" />
                    Save Permissions
                  </Button>
                  <Button 
                    variant="text"
                    onClick={handleCancelEditPermissions}
                    disabled={savingPermissions}
                  >
                    <MdCancel className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : userRolePermissions ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  {userRolePermissions.canViewResults ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">✗</span>
                  )}
                  <span className="text-sm text-gray-700">View Results</span>
                </div>
                <div className="flex items-center space-x-2">
                  {userRolePermissions.canViewMachines ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">✗</span>
                  )}
                  <span className="text-sm text-gray-700">View Machines</span>
                </div>
                <div className="flex items-center space-x-2">
                  {userRolePermissions.canViewSettings ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">✗</span>
                  )}
                  <span className="text-sm text-gray-700">View Settings</span>
                </div>
                <div className="flex items-center space-x-2">
                  {userRolePermissions.canManageUsers ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">✗</span>
                  )}
                  <span className="text-sm text-gray-700">Manage Users</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Loading permissions...</p>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">About Roles</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>Admin:</strong> Full access to all features and settings. Cannot have permissions adjusted.</li>
            <li><strong>User:</strong> Permissions are controlled by the User Role Permissions settings above. All users with the User role share the same permissions.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
