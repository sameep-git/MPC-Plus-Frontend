// API service for MPC Plus application
// Replaces mock functions with real calls. Prefer REST backend via NEXT_PUBLIC_API_URL.
// If Supabase env vars are present, Supabase will be used as a fallback option.

import { API_CONSTANTS, UI_CONSTANTS } from '../constants';
import supabase from './supabaseClient';
import type { Machine as MachineType } from '../models/Machine';
import type { UpdateModel as UpdateModelType } from '../models/Update';
import type { Result as ResultType } from '../models/Result';
import type { Beam as BeamType } from '../models/Beam';

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

export const fetchResults = async (month: number, year: number, machineId: string) => {
  try {
    if (API_BASE) {
      const url = new URL(`${API_BASE.replace(/\/$/, '')}/results`);
      url.searchParams.set('month', String(month));
      url.searchParams.set('year', String(year));
      url.searchParams.set('machineId', machineId);
      console.log('[fetchResults] Fetching:', url.toString());
      const result = await safeFetch(url.toString());
      console.log('[fetchResults] Response:', result);
      return result;
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .eq('machineId', machineId);
      if (error) throw error;
      return data;
    }

    return null;
  } catch (err) {
    console.error('[fetchResults] Error:', err);
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

// Beams API
export const fetchBeamTypes = async (): Promise<string[]> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/beams/types`;
      return await safeFetch(url);
    }

    if (supabase) {
      // If using Supabase, assume a table 'beams' with 'type' column
      const { data, error } = await supabase.from('beams').select('type');
      if (error) throw error;
      return Array.from(new Set((data as any[]).map((r) => r.type))).filter(Boolean) as string[];
    }

    return [];
  } catch (err) {
    throw err;
  }
};

type FetchBeamsParams = {
  machineId: string;
  type: string;
  date?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  range?: 'week' | 'month' | 'quarter';
};

export const fetchBeams = async (params: FetchBeamsParams): Promise<BeamType[]> => {
  try {
    if (API_BASE) {
      const url = new URL(`${API_BASE.replace(/\/$/, '')}/beams`);
      url.searchParams.set('type', params.type);
      url.searchParams.set('machine-id', params.machineId);
      if (params.date) url.searchParams.set('date', params.date);
      if (params.startDate) url.searchParams.set('start-date', params.startDate);
      if (params.endDate) url.searchParams.set('end-date', params.endDate);
      if (params.range) url.searchParams.set('range', params.range);
      return await safeFetch(url.toString());
    }

    if (supabase) {
      let query = supabase.from('beams').select('*').eq('type', params.type).eq('machineId', params.machineId);
      if (params.date) query = query.eq('date', params.date);
      if (params.startDate) query = query.gte('date', params.startDate);
      if (params.endDate) query = query.lte('date', params.endDate);
      const { data, error } = await query;
      if (error) throw error;
      return data as BeamType[];
    }

    return [] as BeamType[];
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
