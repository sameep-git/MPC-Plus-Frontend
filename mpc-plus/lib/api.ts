// API service for MPC Plus application
// Replaces mock functions with real calls. Prefer REST backend via NEXT_PUBLIC_API_URL.
// If Supabase env vars are present, Supabase will be used as a fallback option.

import { UI_CONSTANTS } from '../constants';
import supabase from './supabaseClient';
import type { Machine as MachineType } from '../models/Machine';
import type { UpdateModel as UpdateModelType } from '../models/Update';
import type { Beam as BeamType } from '../models/Beam';
import type { GeoCheck as GeoCheckType } from '../models/GeoCheck';

// Helper to convert object keys to camelCase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => {
        // Handle snake_case to camelCase conversion
        const camelKey = key.replace(/_([a-z0-9])/g, (match, letter) => letter.toUpperCase());
        // Handle PascalCase to camelCase conversion
        const finalKey = camelKey.charAt(0).toLowerCase() + camelKey.slice(1);

        return {
          ...result,
          [finalKey]: toCamelCase(obj[key]),
        };
      },
      {}
    );
  }
  return obj;
};

// Prefer explicit API URL. If not provided, fall back to NEXT_PUBLIC_SUPABASE_URL so
// passing NEXT_PUBLIC_SUPABASE_URL allows calling Supabase-hosted REST endpoints.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';


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

      return await safeFetch(url);
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
      const result = await safeFetch(url.toString());
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
  // Pending real auth integration, return a mocked admin user for the UI
  return {
    id: 'mock-user-stephen',
    name: 'Stephen',
    role: 'Admin',
  };
};

// Beams API
export const fetchBeamTypes = async (): Promise<string[]> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/beams/types`;
      return await safeFetch(url);
    }

    if (supabase) {
      const { data, error } = await supabase.from('beams').select('type');
      if (error) throw error;
      return Array.from(new Set((data as { type: string }[]).map((r) => r.type))).filter(Boolean) as string[];
    }

    return [];
  } catch (err) {
    throw err;
  }
};

type FetchBeamsParams = {
  machineId: string;
  type?: string;
  date?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  range?: 'week' | 'month' | 'quarter';
};

import type { CheckGroup } from '../models/CheckGroup';

export const fetchBeams = async (params: FetchBeamsParams): Promise<CheckGroup[]> => {
  try {
    if (API_BASE) {
      const url = new URL(`${API_BASE.replace(/\/$/, '')}/beams`);
      // Note: API spec uses machineId (camelCase) for /beams
      url.searchParams.set('machineId', params.machineId);
      if (params.type) url.searchParams.set('type', params.type);
      if (params.date) url.searchParams.set('date', params.date);
      if (params.startDate) url.searchParams.set('startDate', params.startDate);
      if (params.endDate) url.searchParams.set('endDate', params.endDate);
      if (params.startDate) url.searchParams.set('startDate', params.startDate);
      if (params.endDate) url.searchParams.set('endDate', params.endDate);
      const data = await safeFetch(url.toString());
      return toCamelCase(data);
    }

    if (supabase) {
      let query = supabase.from('beams').select('*').eq('type', params.type).eq('machineId', params.machineId);
      if (params.date) query = query.eq('date', params.date);
      if (params.startDate) query = query.gte('date', params.startDate);
      if (params.endDate) query = query.lte('date', params.endDate);
      const { data, error } = await query;
      if (error) throw error;
      // Note: Supabase direct fallback does not support grouping yet.
      return data as unknown as CheckGroup[];
    }

    return [] as CheckGroup[];
  } catch (err) {
    throw err;
  }
};

export const approveBeams = async (beamIds: string[], approvedBy: string): Promise<BeamType[]> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/beams/approve`;
      const data = await safeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beamIds, approvedBy })
      });
      return toCamelCase(data);
    }

    if (supabase) {
      // Supabase direct Update approach
      // Since we can't do a bulk update with dynamic values easily in one logical op if validation was needed,
      // but here we are just setting fixed values for a list of IDs.
      // Supabase-js can update multiple rows if the filter matches.
      const { data, error } = await supabase
        .from('beams')
        .update({
          approved_by: approvedBy,
          approved_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
        })
        .in('id', beamIds)
        .select();

      if (error) throw error;
      return toCamelCase(data) as BeamType[];
    }

    return [];
  } catch (err) {
    console.error('[approveBeams] Error:', err);
    throw err;
  }
};

export type FetchGeoChecksParams = {
  machineId: string;
  type?: string;
  date?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  range?: 'week' | 'month' | 'quarter';
};

export const fetchGeoChecks = async (params: FetchGeoChecksParams): Promise<GeoCheckType[]> => {
  try {
    if (API_BASE) {
      const url = new URL(`${API_BASE.replace(/\/$/, '')}/geochecks`);
      url.searchParams.set('machine-id', params.machineId);
      if (params.type) url.searchParams.set('type', params.type);
      if (params.date) url.searchParams.set('date', params.date);
      if (params.startDate) url.searchParams.set('start-date', params.startDate);
      if (params.endDate) url.searchParams.set('end-date', params.endDate);
      if (params.startDate) url.searchParams.set('start-date', params.startDate);
      if (params.endDate) url.searchParams.set('end-date', params.endDate);
      const data = await safeFetch(url.toString());
      return toCamelCase(data);
    }

    if (supabase) {
      let query = supabase.from('geochecks').select('*').eq('machine_id', params.machineId);
      if (params.type) query = query.eq('type', params.type);
      if (params.date) query = query.eq('date', params.date);
      if (params.startDate) query = query.gte('date', params.startDate);
      if (params.endDate) query = query.lte('date', params.endDate);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GeoCheckType[];
    }

    return [] as GeoCheckType[];
  } catch (err) {
    throw err;
  }
};

// Threshold API
export interface Threshold {
  id?: string;
  machineId: string;
  checkType: 'geometry' | 'beam';
  beamVariant?: string;
  metricType: string;
  value: number;
  lastUpdated?: string;
}

export const fetchThresholds = async (): Promise<Threshold[]> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/thresholds/all`;
      return toCamelCase(await safeFetch(url));
    }

    if (supabase) {
      const { data, error } = await supabase.from('thresholds').select('*');
      if (error) throw error;
      return toCamelCase(data);
    }

    return [];
  } catch (err) {
    console.error('[fetchThresholds] Error:', err);
    throw err;
  }
};

export const saveThreshold = async (threshold: Threshold): Promise<Threshold> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/thresholds`;
      const data = await safeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(threshold),
      });
      return toCamelCase(data);
    }

    if (supabase) {
      // Upsert logic for Supabase
      // Assuming 'machine_id', 'check_type', 'beam_variant', 'metric_type' composite unique key or similar
      // We need to convert camelCase back to snake_case for Supabase if needed, but existing code seems to expect snake_case in DB
      // We will do a best effort mapping here
      const dbPayload = {
        machine_id: threshold.machineId,
        check_type: threshold.checkType,
        beam_variant: threshold.beamVariant,
        metric_type: threshold.metricType,
        value: threshold.value,
        last_updated: new Date().toISOString(),
        ...(threshold.id ? { id: threshold.id } : {})
      };

      const { data, error } = await supabase
        .from('thresholds')
        .upsert(dbPayload)
        .select()
        .single();

      if (error) throw error;
      return toCamelCase(data);
    }

    throw new Error('No API or Supabase configured');
  } catch (err) {
    console.error('[saveThreshold] Error:', err);
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
