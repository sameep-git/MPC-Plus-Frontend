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
        .eq('machine_id', machineId);
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
      const { data, error } = await supabase.from('beam_variants').select('variant');
      if (error) throw error;
      return (data as { variant: string }[]).map((r) => r.variant).sort();
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
      const data = await safeFetch(url.toString());
      return toCamelCase(data);
    }

    if (supabase) {
      // Join beam_variants via typeID FK to get the variant name
      let query = supabase
        .from('beams')
        .select('*, beam_variants(variant)')
        .eq('machine_id', params.machineId);
      if (params.type) {
        // Filter by variant name through the FK join
        query = query.eq('beam_variants.variant', params.type);
      }
      if (params.date) query = query.eq('date', params.date);
      if (params.startDate) query = query.gte('date', params.startDate);
      if (params.endDate) query = query.lte('date', params.endDate);
      const { data, error } = await query;
      if (error) throw error;

      // Map beam_variants join data onto the beam's type field
      const mapped = (data || []).map((beam: Record<string, unknown>) => {
        const variants = beam.beam_variants as { variant: string } | null;
        return {
          ...beam,
          type: variants?.variant ?? beam.type, // Prefer joined variant name
        };
      });

      // Note: Supabase direct fallback does not support grouping yet.
      return toCamelCase(mapped) as unknown as CheckGroup[];
    }

    return [] as CheckGroup[];
  } catch (err) {
    throw err;
  }
};

export const approveBeams = async (beamIds: string[], approvedBy: string): Promise<BeamType[]> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/beams/accept`;
      const data = await safeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beamIds: beamIds, approvedBy: approvedBy })
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
          approved_date: new Date().toISOString() // Full ISO timestamp
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

export const approveGeoChecks = async (geoCheckIds: string[], approvedBy: string): Promise<GeoCheckType[]> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/geochecks/accept`;
      const data = await safeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geoCheckIds: geoCheckIds, approvedBy: approvedBy })
      });
      return toCamelCase(data);
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('geochecks')
        .update({
          approved_by: approvedBy,
          approved_date: new Date().toISOString()
        })
        .in('id', geoCheckIds)
        .select();

      if (error) throw error;
      return toCamelCase(data) as GeoCheckType[];
    }
    return [];
  } catch (err) {
    console.error('[approveGeoChecks] Error:', err);
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
      const data = await safeFetch(url.toString());
      return toCamelCase(data);
    }

    if (supabase) {
      // Use geochecks_full view to get MLC leaf data from child tables
      let query = supabase.from('geochecks_full').select('*').eq('machine_id', params.machineId);
      if (params.type) query = query.eq('type', params.type);
      if (params.date) query = query.eq('date', params.date);
      if (params.startDate) query = query.gte('date', params.startDate);
      if (params.endDate) query = query.lte('date', params.endDate);
      const { data, error } = await query;
      if (error) throw error;
      return toCamelCase(data) as unknown as GeoCheckType[];
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

// Report Generation API
export interface ReportRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  machineId: string;
  selectedChecks: string[];
}

export const generateReport = async (payload: ReportRequest): Promise<Blob> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/reports/generate`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 
              ? { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } 
              : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`${res.status} ${res.statusText}: ${text}`);
      }

      return await res.blob();
    }

    throw new Error('Report generation only supported via Backend API');
  } catch (err) {
    console.error('[generateReport] Error:', err);
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

// ============================================
// DOC Factor Types and API Functions
// ============================================

export interface DocFactor {
  id?: string;
  machineId: string;
  beamVariantId: string;
  beamVariantName?: string;
  beamId: string;
  msdAbs: number;
  mpcRel: number;
  docFactorValue: number;
  measurementDate: string; // YYYY-MM-DD
  startDate: string;       // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD or null
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface BeamCheckOption {
  id: string;
  timestamp: string;
  relOutput: number;
  type: string;
}

export interface BeamVariantWithId {
  id: string;
  variant: string;
}

/**
 * Fetch all DOC factors, optionally filtered by machine
 */
export const fetchDocFactors = async (machineId?: string): Promise<DocFactor[]> => {
  try {
    if (API_BASE) {
      const url = machineId
        ? `${API_BASE.replace(/\/$/, '')}/docfactors?machineId=${encodeURIComponent(machineId)}`
        : `${API_BASE.replace(/\/$/, '')}/docfactors`;
      return await safeFetch(url);
    }

    if (supabase) {
      let query = supabase.from('doc').select('*');
      if (machineId) {
        query = query.eq('machine_id', machineId);
      }
      const { data, error } = await query.order('start_date', { ascending: false });
      if (error) throw error;
      return toCamelCase(data) as DocFactor[];
    }

    return [];
  } catch (err) {
    console.error('[fetchDocFactors] Error:', err);
    throw err;
  }
};

/**
 * Get the applicable DOC factor for a specific date
 */
export const fetchApplicableDocFactor = async (
  machineId: string,
  beamVariantId: string,
  date: string
): Promise<DocFactor | null> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/docfactors/applicable?machineId=${encodeURIComponent(machineId)}&beamVariantId=${encodeURIComponent(beamVariantId)}&date=${encodeURIComponent(date)}`;
      try {
        return await safeFetch(url);
      } catch (err) {
        // 404 means no applicable factor found
        if (err instanceof Error && err.message.includes('404')) {
          return null;
        }
        throw err;
      }
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('doc')
        .select('*')
        .eq('machine_id', machineId)
        .eq('beam_variant_id', beamVariantId)
        .lte('start_date', date)
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows
        throw error;
      }

      // Check end_date condition
      const doc = toCamelCase(data) as DocFactor;
      if (doc.endDate && date >= doc.endDate) {
        return null;
      }
      return doc;
    }

    return null;
  } catch (err) {
    console.error('[fetchApplicableDocFactor] Error:', err);
    throw err;
  }
};

/**
 * Create a new DOC factor
 */
export const createDocFactor = async (docFactor: Omit<DocFactor, 'id' | 'docFactorValue' | 'createdAt' | 'updatedAt'>): Promise<DocFactor> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/docfactors`;
      return await safeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docFactor),
      });
    }

    throw new Error('DocFactor creation requires API backend');
  } catch (err) {
    console.error('[createDocFactor] Error:', err);
    throw err;
  }
};

/**
 * Update an existing DOC factor
 */
export const updateDocFactor = async (docFactor: DocFactor): Promise<DocFactor> => {
  try {
    if (!docFactor.id) throw new Error('DocFactor ID is required for update');

    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/docfactors/${docFactor.id}`;
      return await safeFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docFactor),
      });
    }

    throw new Error('DocFactor update requires API backend');
  } catch (err) {
    console.error('[updateDocFactor] Error:', err);
    throw err;
  }
};

/**
 * Delete a DOC factor
 */
export const deleteDocFactor = async (id: string): Promise<void> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/docfactors/${id}`;
      await safeFetch(url, { method: 'DELETE' });
      return;
    }

    throw new Error('DocFactor deletion requires API backend');
  } catch (err) {
    console.error('[deleteDocFactor] Error:', err);
    throw err;
  }
};

/**
 * Fetch beam checks for a specific date/machine/beam type (for DOC factor selection)
 */
export const fetchBeamChecksForDate = async (
  machineId: string,
  beamType: string,
  date: string
): Promise<BeamCheckOption[]> => {
  try {
    if (API_BASE) {
      const url = `${API_BASE.replace(/\/$/, '')}/beams/by-date?machineId=${encodeURIComponent(machineId)}&beamType=${encodeURIComponent(beamType)}&date=${encodeURIComponent(date)}`;
      return await safeFetch(url);
    }

    if (supabase) {
      const startOfDay = `${date}T00:00:00Z`;
      const endOfDay = `${date}T23:59:59Z`;

      // Join beam_variants to get variant name, filter by variant instead of type text
      const { data, error } = await supabase
        .from('beams')
        .select('id, timestamp, rel_output, type, beam_variants(variant)')
        .eq('machine_id', machineId)
        .eq('beam_variants.variant', beamType)
        .gte('timestamp', startOfDay)
        .lte('timestamp', endOfDay)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return (data || []).map((b: { id: string; timestamp: string; rel_output: number | null; type: string | null; beam_variants: { variant: string } | null }) => ({
        id: b.id,
        timestamp: b.timestamp,
        relOutput: b.rel_output ?? 0,
        type: b.beam_variants?.variant ?? b.type ?? beamType
      }));
    }

    return [];
  } catch (err) {
    console.error('[fetchBeamChecksForDate] Error:', err);
    throw err;
  }
};

/**
 * Fetch beam variants with their IDs
 */
export const fetchBeamVariantsWithIds = async (): Promise<BeamVariantWithId[]> => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('beam_variants')
        .select('id, variant')
        .order('variant', { ascending: true });

      if (error) throw error;
      return data as BeamVariantWithId[];
    }

    return [];
  } catch (err) {
    console.error('[fetchBeamVariantsWithIds] Error:', err);
    throw err;
  }
};
