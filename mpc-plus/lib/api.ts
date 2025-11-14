// API service for MPC Plus application
// This file contains all API-related functions and types

import { API_CONSTANTS, UI_CONSTANTS } from '../constants';

export interface Machine {
  id: string;
  name: string;
  status: 'active' | 'maintenance' | 'inactive';
  lastUpdate?: string;
  location?: string;
}

export interface Update {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'info' | 'signoff' | 'threshold';
  priority?: 'low' | 'medium' | 'high';
}

export interface UserPermissions {
  canViewResults: boolean;
  canViewMachines: boolean;
  canViewSettings: boolean;
  canManageUsers: boolean;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
}

// Mock API functions - replace with actual API calls
export const fetchMachines = async (): Promise<Machine[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, API_CONSTANTS.DELAYS.MACHINES));
  
  // Mock data - replace with actual API call
  return [
    { 
      id: '1', 
      name: 'Machine Name 1', 
      status: 'active',
      lastUpdate: '2024-10-14T10:30:00Z',
      location: 'Floor 1'
    },
    { 
      id: '2', 
      name: 'Machine Name 2', 
      status: 'active',
      lastUpdate: '2024-10-14T09:15:00Z',
      location: 'Floor 1'
    },
    { 
      id: '3', 
      name: 'Machine Name 3', 
      status: 'maintenance',
      lastUpdate: '2024-10-13T16:45:00Z',
      location: 'Floor 2'
    },
    { 
      id: '4', 
      name: 'Machine Name 4', 
      status: 'active',
      lastUpdate: '2024-10-14T11:20:00Z',
      location: 'Floor 2'
    },
  ];
};

export const fetchUpdates = async (): Promise<Update[]> => {
  await new Promise(resolve => setTimeout(resolve, API_CONSTANTS.DELAYS.UPDATES));
  
  // Mock data - replace with actual API call
  return [
    {
      id: '1',
      title: 'New MPC Data for 10/14',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla tortor.',
      date: '2024-10-14',
      type: 'info',
      priority: 'medium'
    },
    {
      id: '2',
      title: 'Sign-off missing for Machine 2',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla tortor.',
      date: '2024-10-13',
      type: 'signoff',
      priority: 'low'
    },
    {
      id: '3',
      title: 'View checks close to threshold',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla tortor.',
      date: '2024-10-12',
      type: 'threshold',
      priority: 'high'
    }
  ];
};

export const fetchUser = async (): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, API_CONSTANTS.DELAYS.USER));
  
  // Mock data - replace with actual API call
  return {
    id: '1',
    name: 'Stephen',
    role: 'admin',
    avatar: undefined // Will use initials fallback
  };
};

// User Management API functions
export const fetchUsers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, API_CONSTANTS.DELAYS.USER));
  
  // Mock data - replace with actual API call
  return [
    {
      id: '1',
      name: 'Stephen',
      role: 'admin',
      avatar: undefined
    },
    {
      id: '2',
      name: 'John Doe',
      role: 'user',
    },
    {
      id: '3',
      name: 'Jane Smith',
      role: 'user',
    },
    {
      id: '4',
      name: 'Bob Johnson',
      role: 'user',
    },
  ];
};

export const updateUserRole = async (userId: string, role: 'admin' | 'user'): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Mock API call - replace with actual API call
  const users = await fetchUsers();
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const updatedUser: User = {
    ...user,
    role,
  };
  
  return updatedUser;
};

// Global User Role Permissions Management
const USER_ROLE_PERMISSIONS_STORAGE_KEY = 'userRolePermissions';

export const getUserRolePermissions = async (): Promise<UserPermissions> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Check localStorage for saved permissions
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(USER_ROLE_PERMISSIONS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // If parsing fails, return defaults
      }
    }
  }
  
  // Default permissions for User role
  return {
    canViewResults: true,
    canViewMachines: true,
    canViewSettings: false,
    canManageUsers: false,
  };
};

export const updateUserRolePermissions = async (permissions: UserPermissions): Promise<UserPermissions> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Save to localStorage (in real app, this would be an API call)
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_ROLE_PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
  }
  
  return permissions;
};

// Error handling wrapper
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return UI_CONSTANTS.ERRORS.UNEXPECTED_ERROR;
};
