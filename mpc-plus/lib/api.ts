// API service for MPC Plus application
// Replaces mock functions with real calls. Prefer REST backend via NEXT_PUBLIC_API_URL.
// If Supabase env vars are present, Supabase will be used as a fallback option.

import { API_CONSTANTS, UI_CONSTANTS } from '../constants';
import supabase from './supabaseClient';
import type { Machine as MachineType } from '../models/Machine';
import type { UpdateModel as UpdateModelType } from '../models/Update';
import type { Result as ResultType } from '../models/Result';

// Prefer explicit API URL. If not provided, fall back to NEXT_PUBLIC_SUPABASE_URL so
// passing NEXT_PUBLIC_SUPABASE_URL allows calling Supabase-hosted REST endpoints.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const safeFetch = async (input: RequestInfo, init?: RequestInit) => {
  // Inject Supabase publishable apikey header if available (useful when calling
  // Supabase REST endpoints directly via NEXT_PUBLIC_SUPABASE_URL).
  const headers = new Headers(init?.headers as HeadersInit);
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (supabaseKey) {
    headers.set('apikey', supabaseKey);
  }

  const res = await fetch(input, { ...(init || {}), headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json().catch(() => null);
};

export const fetchMachines = async (): Promise<MachineType[]> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/machines`;
      console.log('[fetchMachines] Fetching:', url);
      const result = await safeFetch(url);
      console.log('[fetchMachines] Response:', result);
      return result;
    }

    if (supabase) {
      const { data, error } = await supabase.from('machines').select('*');
      if (error) throw error;
      return data as MachineType[];
    }

    // Last fallback: return empty array but signal with console (keeps UI from crashing)
    console.warn('No API_BASE or Supabase configured — fetchMachines returning empty array');
    return [];
  } catch (err) {
    console.error('[fetchMachines] Error:', err);
    throw err;
  }
};

export const fetchUpdates = async (): Promise<UpdateModelType[]> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/updates`;
      return await safeFetch(url);
    }

    if (supabase) {
      const { data, error } = await supabase.from('updates').select('*');
      if (error) throw error;
      return data as UpdateModelType[];
    }

    return [];
  } catch (err) {
    throw err;
  }
};

export const fetchResults = async (month: number, year: number): Promise<ResultType[]> => {
  try {
    if (API_BASE) {
      const url = new URL(`${API_BASE.replace(/\/$/, '')}/results`);
      url.searchParams.set('month', String(month));
      url.searchParams.set('year', String(year));
      return await safeFetch(url.toString());
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .eq('month', month)
        .eq('year', year);
      if (error) throw error;
      return data as ResultType[];
    }

    return [];
  } catch (err) {
    throw err;
  }
};

export const fetchUser = async (): Promise<{ id: string; name: string; role: string } | null> => {
  try {
    // If you have an auth system, use it here. For now try Supabase user or return null.
    if (supabase) {
      const user = (await supabase.auth.getUser()).data?.user ?? null;
      if (!user) return null;
      return { id: user.id, name: (user.user_metadata as any)?.name ?? user.email ?? 'User', role: 'user' };
    }

    return null;
  } catch (err) {
    throw err;
  }
};

// Error handling wrapper
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return UI_CONSTANTS.ERRORS?.UNEXPECTED_ERROR ?? 'Unexpected error';
};
