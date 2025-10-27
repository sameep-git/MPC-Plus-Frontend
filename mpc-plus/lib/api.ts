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
  type: 'data' | 'threshold' | 'alert' | 'maintenance';
  priority?: 'low' | 'medium' | 'high';
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer';
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
  
  return [
    {
      id: '1',
      title: 'New MPC Data for 10/14',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla tortor.',
      date: '2024-10-14',
      type: 'data',
      priority: 'medium'
    },
    {
      id: '2',
      title: 'New MPC Data for 10/13',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla tortor.',
      date: '2024-10-13',
      type: 'data',
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
  
  return {
    id: '1',
    name: 'Stephen',
    role: 'admin',
    avatar: undefined // Will use initials fallback
  };
};

// Error handling wrapper
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return UI_CONSTANTS.ERRORS.UNEXPECTED_ERROR;
};
