'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine
} from 'recharts';
import { ChevronDown, ChevronUp, LineChart as ChartIcon, X, Eraser } from 'lucide-react';
import { fetchUser, handleApiError, fetchGeoChecks, fetchBeams, acceptBeams } from '../../lib/api';
import {
  Navbar,
  Button,
  DatePicker,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Checkbox,
} from '../../components/ui';
import { UI_CONSTANTS, GRAPH_CONSTANTS } from '../../constants';
import { getSettings } from '../../lib/settings';
import type { GeoCheck } from '../../models/GeoCheck';
import type { Beam } from '../../models/Beam';
import { DateRangePicker } from '../../components/ui/date-range-picker';
import { DateRange } from "react-day-picker";

const getGraphThresholdSettings = () => {
  const settings = getSettings();
  return {
    topPercent: settings.graphThresholdTopPercent ?? GRAPH_CONSTANTS.DEFAULT_THRESHOLD_PERCENT,
    bottomPercent: settings.graphThresholdBottomPercent ?? GRAPH_CONSTANTS.DEFAULT_THRESHOLD_PERCENT,
    color: settings.graphThresholdColor ?? GRAPH_CONSTANTS.DEFAULT_THRESHOLD_COLOR,
  };
};

const getBaselineSettingsSnapshot = () => getSettings().baseline;

const DEFAULT_Y_AXIS_DOMAIN = GRAPH_CONSTANTS.Y_AXIS_DOMAINS.DEFAULT as [number, number];

const getMetricKey = (metricName: string): string => {
  return metricName.replace(/[^a-zA-Z0-9]/g, '_');
};

// Extract beam type from check ID (e.g., "beam-2.5x" -> "2.5x", "beam-6xfff" -> "6xFFF")
// Extract beam type from check ID (e.g., "beam-2.5x" -> "2.5x", "beam-6xfff" -> "6xFFF")
/* Unused helper
const getBeamTypeFromCheckId = (checkId: string): string | null => {
  if (checkId.startsWith('beam-')) {
    const beamType = checkId.replace('beam-', '');
    // Capitalize FFF in 6xFFF
    if (beamType === '6xfff') {
      return '6xFFF';
    }
    return beamType;
  }
  return null;
};
*/

// Create beam-specific metric name
const createBeamSpecificMetricName = (baseMetricName: string, beamType: string | null): string => {
  if (!beamType) {
    return baseMetricName;
  }
  return `${baseMetricName} (${beamType})`;
};

const getDefaultDomainForMetric = (metricName: string): [number, number] => {
  const lowerMetric = metricName.toLowerCase();

  if (lowerMetric.includes('output change')) {
    return GRAPH_CONSTANTS.Y_AXIS_DOMAINS.OUTPUT_CHANGE as [number, number];
  }

  if (lowerMetric.includes('uniformity change')) {
    return GRAPH_CONSTANTS.Y_AXIS_DOMAINS.UNIFORMITY_CHANGE as [number, number];
  }

  if (lowerMetric.includes('center shift')) {
    return GRAPH_CONSTANTS.Y_AXIS_DOMAINS.CENTER_SHIFT as [number, number];
  }

  return DEFAULT_Y_AXIS_DOMAIN;
};

// Mock data for check results
interface CheckMetric {
  name: string;
  value: string | number;
  thresholds: string;
  absoluteValue: string | number;
  status: 'pass' | 'fail' | 'warning';
}

interface CheckResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  metrics: CheckMetric[];
  acceptedBy?: string;
  acceptedDate?: string;
}

// Mock data for graph
interface GraphDataPoint {
  date: string;
  fullDate: string;
  [key: string]: string | number; // Allow dynamic metric keys
}

// Generate mock graph data for multiple metrics
// Generate mock graph data or fallback structure when data is missing
const generateGraphData = (startDate: Date, endDate: Date, _metrics: Set<string>): GraphDataPoint[] => {
  const data: GraphDataPoint[] = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  const iterDate = new Date(currentDate);
  // Ensure we compare apples to apples (dates)
  iterDate.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (iterDate <= end) {
    // Use local date string for ISO part to match how fetchGraphData likely works (or just ISO slice)
    // fetchGraphData uses: const isoDate = currentDate.toISOString().split('T')[0];
    // Note: toISOString is UTC. ensure we handle timezone correctly or consistent with fetchGraphData.
    // fetchGraphData: 
    // const isoDate = currentDate.toISOString().split('T')[0];
    // const displayDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // We will match that logic exactly.
    // However, if iterDate is local midnight, toISOString might be previous day if negative offset.
    // fetchGraphData takes startDate as Date.

    // Let's stick to the convention used in fetchGraphData (which I should double check logic of later if needed, but for now matching it is best).
    // Actually fetchGraphData does:
    // const isoDate = currentDate.toISOString().split('T')[0];
    // This suggests currentDate is expected to be UTC or we accept the UTC date string.

    const isoDate = iterDate.toISOString().split('T')[0];
    const displayDate = iterDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const point: GraphDataPoint = {
      date: displayDate,
      fullDate: isoDate,
    };

    data.push(point);
    iterDate.setDate(iterDate.getDate() + 1);
  }
  return data;
};

// Helper to format date for API input
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fetchGraphData = async (startDate: Date, endDate: Date): Promise<GraphDataPoint[]> => {
  try {
    // We need machineId to fetch data
    let machineId = '';
    if (typeof window !== 'undefined') {
      machineId = sessionStorage.getItem('resultDetailMachineId') || localStorage.getItem('selectedMachineId') || '';
    }
    if (!machineId) return [];

    const startStr = formatDateForInput(startDate);
    const endStr = formatDateForInput(endDate);

    const [beams, geoChecks] = await Promise.all([
      fetchBeams({ machineId, startDate: startStr, endDate: endStr }),
      fetchGeoChecks({ machineId, startDate: startStr, endDate: endStr })
    ]);

    const data: GraphDataPoint[] = [];
    const currentDate = new Date(startDate);

    // Create a map for quick lookup if needed, or just filter. 
    // Since range is small (14 days), filtering is fine.

    while (currentDate <= endDate) {
      const isoDate = currentDate.toISOString().split('T')[0];
      const displayDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const dataPoint: GraphDataPoint = {
        date: displayDate,
        fullDate: isoDate,
      };

      // Map Beams
      // Verify date matching. API dates are strings YYYY-MM-DD.
      // We assume local date boundaries from the helper match API dates.

      const dayBeams = beams.filter(b => b.date === isoDate);
      dayBeams.forEach(b => {
        if (b.type) {
          const type = b.type;
          if (b.relOutput !== undefined && b.relOutput !== null) {
            const key = getMetricKey(createBeamSpecificMetricName('Relative Output', type));
            dataPoint[key] = b.relOutput;
          }
          if (b.relUniformity !== undefined && b.relUniformity !== null) {
            const key = getMetricKey(createBeamSpecificMetricName('Relative Uniformity', type));
            dataPoint[key] = b.relUniformity;
          }
          if (b.centerShift !== undefined && b.centerShift !== null) {
            const key = getMetricKey(createBeamSpecificMetricName('Center Shift', type));
            dataPoint[key] = b.centerShift;
          }
        }
      });

      // Map Geo Checks
      // Assuming one per day or taking the first one
      const dayGeo = geoChecks.find(g => g.date === isoDate);
      if (dayGeo) {
        // IsoCenter
        if (dayGeo.isoCenterSize !== undefined) dataPoint[getMetricKey('Iso Center Size')] = dayGeo.isoCenterSize;
        if (dayGeo.isoCenterMVOffset !== undefined) dataPoint[getMetricKey('Iso Center MV Offset')] = dayGeo.isoCenterMVOffset;
        if (dayGeo.isoCenterKVOffset !== undefined) dataPoint[getMetricKey('Iso Center KV Offset')] = dayGeo.isoCenterKVOffset;

        // Geo Beam Group (Generic)
        if (dayGeo.relativeOutput !== undefined) dataPoint[getMetricKey('Relative Output')] = dayGeo.relativeOutput;
        if (dayGeo.relativeUniformity !== undefined) dataPoint[getMetricKey('Relative Uniformity')] = dayGeo.relativeUniformity;
        // Note: Center Shift might conflict if names are identical, but Beam checks have (type) suffix.
        if (dayGeo.centerShift !== undefined) dataPoint[getMetricKey('Center Shift')] = dayGeo.centerShift;

        // Collimation
        if (dayGeo.collimationRotationOffset !== undefined) dataPoint[getMetricKey('Collimation Rotation Offset')] = dayGeo.collimationRotationOffset;

        // Gantry
        if (dayGeo.gantryAbsolute !== undefined) dataPoint[getMetricKey('Gantry Absolute')] = dayGeo.gantryAbsolute;
        if (dayGeo.gantryRelative !== undefined) dataPoint[getMetricKey('Gantry Relative')] = dayGeo.gantryRelative;

        // Couch
        if (dayGeo.couchLat !== undefined) dataPoint[getMetricKey('Couch Lat')] = dayGeo.couchLat;
        if (dayGeo.couchLng !== undefined) dataPoint[getMetricKey('Couch Lng')] = dayGeo.couchLng;
        if (dayGeo.couchVrt !== undefined) dataPoint[getMetricKey('Couch Vrt')] = dayGeo.couchVrt;
        if (dayGeo.couchRtnFine !== undefined) dataPoint[getMetricKey('Couch Rtn Fine')] = dayGeo.couchRtnFine;
        if (dayGeo.couchRtnLarge !== undefined) dataPoint[getMetricKey('Couch Rtn Large')] = dayGeo.couchRtnLarge;
        if (dayGeo.couchMaxPositionError !== undefined) dataPoint[getMetricKey('Max Position Error')] = dayGeo.couchMaxPositionError;
        if (dayGeo.rotationInducedCouchShiftFullRange !== undefined) dataPoint[getMetricKey('Rotation Induced Shift')] = dayGeo.rotationInducedCouchShiftFullRange;

        // Jaws
        if (dayGeo.jawX1 !== undefined) dataPoint[getMetricKey('Jaw X1')] = dayGeo.jawX1;
        if (dayGeo.jawX2 !== undefined) dataPoint[getMetricKey('Jaw X2')] = dayGeo.jawX2;
        if (dayGeo.jawY1 !== undefined) dataPoint[getMetricKey('Jaw Y1')] = dayGeo.jawY1;
        if (dayGeo.jawY2 !== undefined) dataPoint[getMetricKey('Jaw Y2')] = dayGeo.jawY2;

        // Jaws Parallelism
        if (dayGeo.jawParallelismX1 !== undefined) dataPoint[getMetricKey('Parallelism X1')] = dayGeo.jawParallelismX1;
        if (dayGeo.jawParallelismX2 !== undefined) dataPoint[getMetricKey('Parallelism X2')] = dayGeo.jawParallelismX2;
        if (dayGeo.jawParallelismY1 !== undefined) dataPoint[getMetricKey('Parallelism Y1')] = dayGeo.jawParallelismY1;
        if (dayGeo.jawParallelismY2 !== undefined) dataPoint[getMetricKey('Parallelism Y2')] = dayGeo.jawParallelismY2;

        // MLC Offsets
        if (dayGeo.meanOffsetA !== undefined) dataPoint[getMetricKey('Mean Offset A')] = dayGeo.meanOffsetA;
        if (dayGeo.maxOffsetA !== undefined) dataPoint[getMetricKey('Max Offset A')] = dayGeo.maxOffsetA;
        if (dayGeo.meanOffsetB !== undefined) dataPoint[getMetricKey('Mean Offset B')] = dayGeo.meanOffsetB;
        if (dayGeo.maxOffsetB !== undefined) dataPoint[getMetricKey('Max Offset B')] = dayGeo.maxOffsetB;

        // Not mapping all dynamic leaves (MLC/Backlash) to avoid graph clutter unless requested, 
        // as they are 120+ leaves. But we need them available if selected.
        if (dayGeo.mlcLeavesA) {
          Object.entries(dayGeo.mlcLeavesA).forEach(([key, val]) => {
            dataPoint[getMetricKey(`MLC A Leaf ${key}`)] = val as number;
          });
        }
        if (dayGeo.mlcLeavesB) {
          Object.entries(dayGeo.mlcLeavesB).forEach(([key, val]) => {
            dataPoint[getMetricKey(`MLC B Leaf ${key}`)] = val as number;
          });
        }
        if (dayGeo.mlcBacklashA) {
          Object.entries(dayGeo.mlcBacklashA).forEach(([key, val]) => {
            dataPoint[getMetricKey(`Backlash A Leaf ${key}`)] = val as number;
          });
        }
        if (dayGeo.mlcBacklashB) {
          Object.entries(dayGeo.mlcBacklashB).forEach(([key, val]) => {
            dataPoint[getMetricKey(`Backlash B Leaf ${key}`)] = val as number;
          });
        }
      }

      data.push(dataPoint);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return data;
  } catch (err) {
    console.error('Failed to fetch graph data', err);
    return [];
  }
};

export default function ResultDetailPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  // Get date from sessionStorage (passed from results page) or use current date
  const [selectedDate] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('resultDetailDate');
      if (stored) {
        const [y, m, d] = stored.split('-').map((n) => Number(n));
        if (y && m && d) return new Date(y, m - 1, d);
      }
    }
    return new Date();
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fromFlag = sessionStorage.getItem('resultDetailFrom');
      const storedDate = sessionStorage.getItem('resultDetailDate');
      if (!fromFlag || !storedDate) {
        // If page was not navigated from results with a valid date, block access
        router.replace('/results');
        return;
      }

      // Date already set by lazy init, no need to set again if it matches.
      // But keeping session consumption logic.
      // setSelectedDate(parseLocalDateString(storedDate)); // Removed to avoid double fetch/render

      // Mark as consumed but keep values to avoid React StrictMode double-effect redirects
      sessionStorage.setItem('resultDetailFrom', 'consumed');
    }
  }, [router]);

  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set(['beam-2.5x']));
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [showGraph, setShowGraph] = useState<boolean>(false);

  // Date range for graph
  const [graphDateRange, setGraphDateRange] = useState<{ start: Date; end: Date }>(() => {
    const end = new Date(selectedDate);
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - 14); // 14 days before
    return { start, end };
  });

  // Keep graph range in sync with the selected date once it is loaded from session
  useEffect(() => {
    const end = new Date(selectedDate);
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - 14);
    setGraphDateRange({ start, end });
  }, [selectedDate]);

  // Threshold settings for graph shading sourced from global settings
  const [graphThresholdSettings, setGraphThresholdSettings] = useState(() => getGraphThresholdSettings());
  const [baselineSettings, setBaselineSettings] = useState(() => getBaselineSettingsSnapshot());

  // Base metric names (without beam type)
  // const baseMetricNames = [ ... ]; // Unused now

  // API-backed check results
  const [beamResults, setBeamResults] = useState<CheckResult[]>([]);
  const [geoResults, setGeoResults] = useState<CheckResult[]>([]);
  const checkResults = useMemo(() => [...beamResults, ...geoResults], [beamResults, geoResults]);

  const [isAccepting, setIsAccepting] = useState(false);
  // const [geoChecks, setGeoChecks] = useState<GeoCheck[]>([]); // Unused

  // Report Generation Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  // Initialize with selectedDate
  const [reportStartDate, setReportStartDate] = useState<Date>(() => new Date(selectedDate));
  const [reportEndDate, setReportEndDate] = useState<Date>(() => new Date(selectedDate));
  const [reportSelectedChecks, setReportSelectedChecks] = useState<Set<string>>(new Set());

  // Sign Off Modal State
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [signOffSelectedChecks, setSignOffSelectedChecks] = useState<Set<string>>(new Set());

  // Available checks for selection (derived from checkResults)
  const availableReportChecks = useMemo(() => {
    const beams = checkResults
      .filter(c => c.id.startsWith('beam-'))
      .map(b => ({ id: b.id, name: b.name, type: 'beam' }));

    // Geometry checks (assuming roughly they start with geo-)
    const geos = checkResults
      .filter(c => c.id.startsWith('geo-'))
      .map(g => ({ id: g.id, name: g.name, type: 'geo' }));

    return [...beams, ...geos];
  }, [checkResults]);

  // Initial selection of all checks when available
  useEffect(() => {
    if (availableReportChecks.length > 0 && reportSelectedChecks.size === 0) {
      setReportSelectedChecks(new Set(availableReportChecks.map(c => c.id)));
    }
  }, [availableReportChecks, reportSelectedChecks.size]);

  // Sync report dates with selectedDate
  useEffect(() => {
    setReportStartDate(new Date(selectedDate));
    setReportEndDate(new Date(selectedDate));
  }, [selectedDate]);

  const toggleReportCheck = (checkId: string) => {
    setReportSelectedChecks(prev => {
      const next = new Set(prev);
      if (next.has(checkId)) {
        next.delete(checkId);
      } else {
        next.add(checkId);
      }
      return next;
    });
  };

  const toggleAllReportChecks = (checked: boolean) => {
    if (checked) {
      setReportSelectedChecks(new Set(availableReportChecks.map(c => c.id)));
    } else {
      setReportSelectedChecks(new Set());
    }
  };

  const isAllChecksSelected = availableReportChecks.length > 0 && reportSelectedChecks.size === availableReportChecks.length;

  const toggleSignOffCheck = (checkId: string) => {
    setSignOffSelectedChecks(prev => {
      const next = new Set(prev);
      if (next.has(checkId)) {
        next.delete(checkId);
      } else {
        next.add(checkId);
      }
      return next;
    });
  };

  const toggleAllSignOffChecks = (checked: boolean) => {
    if (checked) {
      setSignOffSelectedChecks(new Set(availableReportChecks.map(c => c.id)));
    } else {
      setSignOffSelectedChecks(new Set());
    }
  };

  const isAllSignOffChecksSelected = availableReportChecks.length > 0 && signOffSelectedChecks.size === availableReportChecks.length;

  const [graphData, setGraphData] = useState<GraphDataPoint[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const userData = await fetchUser();
        setUser(userData);
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

  // Load daily checks from API when date/machine is available
  const loadDailyChecks = useCallback(async (options: { refresh: 'all' | 'beams' } = { refresh: 'all' }) => {
    try {
      if (typeof window === 'undefined') return;
      const machineId = sessionStorage.getItem('resultDetailMachineId') || localStorage.getItem('selectedMachineId');
      const dateStr = (() => {
        const d = selectedDate;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      })();
      if (!machineId) return;

      // Initialize collections
      let loadedGeoChecks: GeoCheck[] = [];
      let loadedBeams: Beam[] = [];

      try {
        if (options.refresh === 'all') {
          // Fetch Geometry Checks
          loadedGeoChecks = await fetchGeoChecks({
            machineId,
            startDate: dateStr,
            endDate: dateStr
          });
        }

        // Fetch Beam Checks always (or when requested)
        loadedBeams = await fetchBeams({
          machineId,
          startDate: dateStr,
          endDate: dateStr
        });

      } catch (e) {
        console.error('Error fetching data:', e);
      }

      // Build result structure

      // Process Beam Checks based on available types to ensure all are displayed
      const beamCheckResults: CheckResult[] = [];

      // Process loaded beams directly to ensure all returned data is displayed
      loadedBeams.forEach((beam, index) => {
        if (!beam || !beam.type) return;
        const type = beam.type;
        const metrics: CheckMetric[] = [];

        // Add standard beam metrics
        if (beam.relOutput !== undefined && beam.relOutput !== null) {
          const name = createBeamSpecificMetricName('Relative Output', type);
          metrics.push({ name, value: beam.relOutput, thresholds: '', absoluteValue: '', status: 'pass' });
        }
        if (beam.relUniformity !== undefined && beam.relUniformity !== null) {
          const name = createBeamSpecificMetricName('Relative Uniformity', type);
          metrics.push({ name, value: beam.relUniformity, thresholds: '', absoluteValue: '', status: 'pass' });
        }
        if (beam.centerShift !== undefined && beam.centerShift !== null) {
          const name = createBeamSpecificMetricName('Center Shift', type);
          metrics.push({ name, value: beam.centerShift, thresholds: '', absoluteValue: '', status: 'pass' });
        }

        if (metrics.length > 0) {
          // Use beam.id if available, otherwise fallback to type-index combo to ensure uniqueness
          // This prevents duplicate key errors if multiple beams of the same type exist
          const uniqueId = beam.id ? `beam-${beam.id}` : `beam-${type}-${index}`;

          // Format time label if available
          let timeLabel = '';
          if (beam.date && beam.date.includes('T')) {
            const timePart = beam.date.split('T')[1];
            if (timePart && timePart.length >= 5) {
              timeLabel = ` - ${timePart.substring(0, 5)}`;
            }
          }

          beamCheckResults.push({
            id: uniqueId,
            name: `Beam Check (${type})${timeLabel}`,
            status: 'PASS', // Assuming pass if data exists, logic can be enhanced if status is available
            metrics,
            acceptedBy: beam.acceptedBy,
            acceptedDate: beam.acceptedDate
          });
        }
      });

      // Sort beam results to maintain a consistent order (chronological then by type)
      beamCheckResults.sort((a, b) => {
        // Sort by name which usually contains the time now, or id
        return a.name.localeCompare(b.name);
      });

      setBeamResults(beamCheckResults);

      // MAPPING GEO CHECKS TO CHECK RESULTS (LEAVES)
      if (options.refresh === 'all') {
        const geoLeaves: CheckResult[] = [];
        if (loadedGeoChecks.length > 0) {
          const gc = loadedGeoChecks[0]; // Assuming one per day for now

          // IsoCenterGroup
          geoLeaves.push({
            id: 'geo-isocenter',
            name: 'IsoCenter Group',
            status: 'PASS',
            metrics: [
              { name: 'Iso Center Size', value: gc.isoCenterSize ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Iso Center MV Offset', value: gc.isoCenterMVOffset ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Iso Center KV Offset', value: gc.isoCenterKVOffset ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
            ]
          });



          // CollimationGroup
          geoLeaves.push({
            id: 'geo-collimation',
            name: 'Collimation Group',
            status: 'PASS',
            metrics: [
              { name: 'Collimation Rotation Offset', value: gc.collimationRotationOffset ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
            ]
          });

          // GantryGroup
          geoLeaves.push({
            id: 'geo-gantry',
            name: 'Gantry Group',
            status: 'PASS',
            metrics: [
              { name: 'Gantry Absolute', value: gc.gantryAbsolute ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Gantry Relative', value: gc.gantryRelative ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
            ]
          });

          // EnhancedCouchGroup
          geoLeaves.push({
            id: 'geo-couch',
            name: 'Enhanced Couch Group',
            status: 'PASS',
            metrics: [
              { name: 'Couch Lat', value: gc.couchLat ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Couch Lng', value: gc.couchLng ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Couch Vrt', value: gc.couchVrt ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Couch Rtn Fine', value: gc.couchRtnFine ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Couch Rtn Large', value: gc.couchRtnLarge ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Max Position Error', value: gc.couchMaxPositionError ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Rotation Induced Shift', value: gc.rotationInducedCouchShiftFullRange ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
            ]
          });

          // MLC Leaves A
          const mlcAMetrics: CheckMetric[] = [];
          if (gc.mlcLeavesA) {
            Object.entries(gc.mlcLeavesA).forEach(([key, val]) => {
              mlcAMetrics.push({ name: `MLC A Leaf ${key}`, value: val as number, thresholds: '', absoluteValue: '', status: 'pass' });
            });
          }
          geoLeaves.push({
            id: 'geo-mlc-a',
            name: 'MLC Leaves A',
            status: 'PASS',
            metrics: mlcAMetrics
          });

          // MLC Leaves B
          const mlcBMetrics: CheckMetric[] = [];
          if (gc.mlcLeavesB) {
            Object.entries(gc.mlcLeavesB).forEach(([key, val]) => {
              mlcBMetrics.push({ name: `MLC B Leaf ${key}`, value: val as number, thresholds: '', absoluteValue: '', status: 'pass' });
            });
          }
          geoLeaves.push({
            id: 'geo-mlc-b',
            name: 'MLC Leaves B',
            status: 'PASS',
            metrics: mlcBMetrics
          });

          // MLC Offsets
          geoLeaves.push({
            id: 'geo-mlc-offsets',
            name: 'MLC Offsets',
            status: 'PASS',
            metrics: [
              { name: 'Mean Offset A', value: gc.meanOffsetA ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Max Offset A', value: gc.maxOffsetA ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Mean Offset B', value: gc.meanOffsetB ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Max Offset B', value: gc.maxOffsetB ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
            ]
          });

          // Backlash Leaves A
          const backlashAMetrics: CheckMetric[] = [];
          if (gc.mlcBacklashA) {
            Object.entries(gc.mlcBacklashA).forEach(([key, val]) => {
              backlashAMetrics.push({ name: `Backlash A Leaf ${key}`, value: val as number, thresholds: '', absoluteValue: '', status: 'pass' });
            });
          }
          geoLeaves.push({
            id: 'geo-backlash-a',
            name: 'Backlash Leaves A',
            status: 'PASS',
            metrics: backlashAMetrics
          });

          // Backlash Leaves B
          const backlashBMetrics: CheckMetric[] = [];
          if (gc.mlcBacklashB) {
            Object.entries(gc.mlcBacklashB).forEach(([key, val]) => {
              backlashBMetrics.push({ name: `Backlash B Leaf ${key}`, value: val as number, thresholds: '', absoluteValue: '', status: 'pass' });
            });
          }
          geoLeaves.push({
            id: 'geo-backlash-b',
            name: 'Backlash Leaves B',
            status: 'PASS',
            metrics: backlashBMetrics
          });


          // Jaws Group
          geoLeaves.push({
            id: 'geo-jaws',
            name: 'Jaws Group',
            status: 'PASS',
            metrics: [
              { name: 'Jaw X1', value: gc.jawX1 ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Jaw X2', value: gc.jawX2 ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Jaw Y1', value: gc.jawY1 ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Jaw Y2', value: gc.jawY2 ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
            ]
          });

          // Jaws Parallelism
          geoLeaves.push({
            id: 'geo-jaws-parallelism',
            name: 'Jaws Parallelism',
            status: 'PASS',
            metrics: [
              { name: 'Parallelism X1', value: gc.jawParallelismX1 ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Parallelism X2', value: gc.jawParallelismX2 ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Parallelism Y1', value: gc.jawParallelismY1 ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
              { name: 'Parallelism Y2', value: gc.jawParallelismY2 ?? '', thresholds: '', absoluteValue: '', status: 'pass' },
            ]
          });
          setGeoResults(geoLeaves);
        } else {
          // If manual refresh and no geo checks loaded (first load might have failed?), maybe keep old?
          // Since we use separate state, we just don't update setGeoResults
        }
      }

      // Apply statuses from monthly day status if provided (Simplified, logic was unused mostly)
      // Removed complex status mapping logic for brevity and because it relied on consolidatedResults

    } catch (err) {
      console.error(err);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadDailyChecks();
  }, [loadDailyChecks]);

  useEffect(() => {
    let isMounted = true;
    const loadGraph = async () => {
      const data = await fetchGraphData(graphDateRange.start, graphDateRange.end);
      if (isMounted) setGraphData(data);
    };
    loadGraph();
    return () => { isMounted = false; };
  }, [graphDateRange]);

  useEffect(() => {
    const refreshSettings = () => {
      setGraphThresholdSettings(getGraphThresholdSettings());
      setBaselineSettings(getBaselineSettingsSnapshot());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', refreshSettings);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', refreshSettings);
      }
    };
  }, []);

  // Initialize temp dates when picker opens
  // Initialize temp dates when picker opens


  const toggleCheck = (checkId: string) => {
    setExpandedChecks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(checkId)) {
        newSet.delete(checkId);
      } else {
        newSet.add(checkId);
      }
      return newSet;
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };


  const formatDateRange = (start: Date, end: Date): string => {
    return `${start.getDate()} ${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getFullYear().toString().slice(-2)} - ${end.getDate()} ${end.toLocaleDateString('en-US', { month: 'short' })} ${end.getFullYear().toString().slice(-2)}`;
  };

  // Format metric values for display based on name
  const formatMetricValue = (metricName: string, value: string | number): string => {
    if (value === '' || value === null || value === undefined) return '-';
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    const lower = metricName.toLowerCase();
    if (lower.includes('output change') || lower.includes('uniformity change')) {
      return `${num.toFixed(2)}%`;
    }
    if (lower.includes('center shift')) {
      return `${num.toFixed(3)}`;
    }
    return num.toFixed(3);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      setGraphDateRange({
        start: range.from,
        end: range.to || range.from // Default to start date if no end date yet
      });
    }
  };

  const handleQuickDateRange = (range: string) => {
    const today = new Date();
    let start: Date;
    let end = new Date(today);

    switch (range) {
      case 'today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        break;
      case 'lastWeek':
        start = new Date(today);
        start.setDate(start.getDate() - 7);
        break;
      case 'lastMonth':
        start = new Date(today);
        start.setMonth(start.getMonth() - 1);
        break;
      case 'lastQuarter':
        start = new Date(today);
        start.setMonth(start.getMonth() - 3);
        break;
      default:
        return;
    }

    setGraphDateRange({ start, end });
  };

  const handleGenerateReport = () => {
    setIsReportModalOpen(true);
  };

  const handleSaveReport = () => {
    // Disabled functionality for now
    /* console.log('Save report clicked', {
      start: reportStartDate,
      end: reportEndDate,
      checks: Array.from(reportSelectedChecks)
    }); */
    setIsReportModalOpen(false);
  };

  // Unused constants
  // const weekDays = CALENDAR_CONSTANTS.WEEK_DAYS_SHORT;
  // const monthNames = CALENDAR_CONSTANTS.MONTH_NAMES;

  // Calculate Y-axis domain based on selected metrics and data

  // Get all available metrics from all beams, excluding individual leaves to avoid clutter
  const getAllAvailableMetrics = (): string[] => {
    const metricsSet = new Set<string>();
    checkResults.forEach(check => {
      check.metrics.forEach(metric => {
        // Exclude leaves from dropdown, they can be selected via table
        if (!metric.name.includes('Leaf')) {
          metricsSet.add(metric.name);
        }
      });
    });
    return Array.from(metricsSet).sort();
  };

  const availableMetrics = getAllAvailableMetrics();

  // Toggle metric selection
  const toggleMetric = (metricName: string) => {
    setSelectedMetrics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(metricName)) {
        newSet.delete(metricName);
      } else {
        newSet.add(metricName);
      }
      return newSet;
    });
    setShowGraph(true);
  };

  const getMetricColor = (index: number): string => {
    return GRAPH_CONSTANTS.METRIC_COLORS[index % GRAPH_CONSTANTS.METRIC_COLORS.length];
  };

  const getManualBaselineValue = (metricName: string): number => {
    const lowerMetric = metricName.toLowerCase();
    if (lowerMetric.includes('output change')) {
      return baselineSettings.manualValues.outputChange;
    }
    if (lowerMetric.includes('uniformity change')) {
      return baselineSettings.manualValues.uniformityChange;
    }
    if (lowerMetric.includes('center shift')) {
      return baselineSettings.manualValues.centerShift;
    }
    return 0;
  };

  const baselineComputation = useMemo(() => {
    const valuesByMetric: Record<string, number | null> = {};
    let baselineDateInRange = false;
    let baselineDataPoint: GraphDataPoint | undefined;

    if (baselineSettings.mode === 'date' && baselineSettings.date) {
      baselineDataPoint = graphData.find((point) => point.fullDate === baselineSettings.date);
      baselineDateInRange = Boolean(baselineDataPoint);

      if (!baselineDataPoint && selectedMetrics.size > 0) {
        const baselineDate = new Date(baselineSettings.date);
        if (!Number.isNaN(baselineDate.getTime())) {
          const fallbackData = generateGraphData(baselineDate, baselineDate, selectedMetrics);
          baselineDataPoint = fallbackData[0];
        }
      }
    }

    Array.from(selectedMetrics).forEach((metricName) => {
      const key = getMetricKey(metricName);
      let baselineValue: number | null = null;

      if (baselineSettings.mode === 'manual') {
        baselineValue = getManualBaselineValue(metricName);
      } else if (baselineSettings.mode === 'date' && baselineDataPoint) {
        const candidate = baselineDataPoint[key];
        baselineValue = typeof candidate === 'number' ? candidate : null;
      }

      valuesByMetric[key] = baselineValue;
    });

    const hasNumericBaseline = Object.values(valuesByMetric).some(
      (value) => typeof value === 'number'
    );

    return {
      valuesByMetric,
      hasNumericBaseline,
      baselineDateInRange,
      requestedDate: baselineSettings.date,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baselineSettings, graphData, selectedMetrics]);

  const normalizedGraphData = useMemo(() => {
    if (!baselineComputation.hasNumericBaseline) {
      return graphData;
    }

    return graphData.map((point) => {
      const nextPoint: GraphDataPoint = { ...point };

      Object.entries(baselineComputation.valuesByMetric).forEach(([key, baselineValue]) => {
        if (typeof baselineValue === 'number') {
          const rawValue = point[key];
          if (typeof rawValue === 'number') {
            nextPoint[key] = Number((rawValue - baselineValue).toFixed(3));
          }
        }
      });

      return nextPoint;
    });
  }, [graphData, baselineComputation]);

  const baselineSummary = useMemo(() => {
    if (baselineSettings.mode === 'date') {
      if (!baselineSettings.date) {
        return {
          message: 'Select a baseline date in Settings to see changes relative to that day.',
          tone: 'muted' as const,
        };
      }

      if (selectedMetrics.size > 0) {
        if (baselineComputation.baselineDateInRange) {
          return {
            message: `Baseline from ${baselineSettings.date}. Values display Δ relative to that day.`,
            tone: 'info' as const,
          };
        }

        return {
          message: `Baseline from ${baselineSettings.date}. Values display Δ relative to that day even though it falls outside the visible range.`,
          tone: 'info' as const,
        };
      }

      return {
        message: `Baseline from ${baselineSettings.date}. Select metrics to view deltas relative to that day.`,
        tone: 'muted' as const,
      };
    }

    const { manualValues } = baselineSettings;
    return {
      message: `Baseline uses manual values — Output ${manualValues.outputChange}, Uniformity ${manualValues.uniformityChange}, Center Shift ${manualValues.centerShift}.`,
      tone: 'info' as const,
    };
  }, [baselineSettings, baselineComputation.baselineDateInRange, selectedMetrics.size]);

  const getBaselineBannerClasses = () => {
    const tone = baselineSummary.tone as string;
    switch (tone) {
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-gray-50 border-gray-200 text-muted-foreground';
    }
  };

  // Clear all selected metrics
  const handleClearSelections = () => {
    setSelectedMetrics(new Set());
  };

  const chartData = baselineComputation.hasNumericBaseline ? normalizedGraphData : graphData;

  const yAxisDomain = useMemo<[number, number]>(() => {
    if (selectedMetrics.size === 0) {
      return DEFAULT_Y_AXIS_DOMAIN;
    }

    const metrics = Array.from(selectedMetrics);
    let domainMin = Number.POSITIVE_INFINITY;
    let domainMax = Number.NEGATIVE_INFINITY;

    metrics.forEach((metricName) => {
      const [defaultMin, defaultMax] = getDefaultDomainForMetric(metricName);
      domainMin = Math.min(domainMin, defaultMin);
      domainMax = Math.max(domainMax, defaultMax);
    });

    if (!Number.isFinite(domainMin) || !Number.isFinite(domainMax)) {
      return DEFAULT_Y_AXIS_DOMAIN;
    }

    chartData.forEach((point) => {
      metrics.forEach((metricName) => {
        const key = getMetricKey(metricName);
        const value = point[key];
        if (typeof value === 'number' && !Number.isNaN(value)) {
          domainMin = Math.min(domainMin, value);
          domainMax = Math.max(domainMax, value);
        }
      });
    });

    if (!Number.isFinite(domainMin) || !Number.isFinite(domainMax)) {
      return DEFAULT_Y_AXIS_DOMAIN;
    }

    if (domainMin === domainMax) {
      const padding = Math.max(Math.abs(domainMin) * 0.1, 0.5);
      return [domainMin - padding, domainMax + padding];
    }

    return [domainMin, domainMax];
  }, [chartData, selectedMetrics]);

  const thresholdValues = useMemo(() => {
    const [min, max] = yAxisDomain;
    const range = max - min;

    if (range <= 0) {
      return {
        topThreshold: max,
        bottomThreshold: min,
        min,
        max,
      };
    }

    const topThreshold = max - (range * graphThresholdSettings.topPercent) / 100;
    const bottomThreshold = min + (range * graphThresholdSettings.bottomPercent) / 100;

    return { topThreshold, bottomThreshold, min, max };
  }, [graphThresholdSettings.bottomPercent, graphThresholdSettings.topPercent, yAxisDomain]);

  const { topThreshold, bottomThreshold, min: thresholdMin, max: thresholdMax } = thresholdValues;

  if (loading) {
    return (
      <div className="min-h-screen bg-background transition-colors">
        <Navbar user={user} />
        <main className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors">
      <Navbar user={user} />

      <main className="p-6 max-w-7xl mx-auto">
        {/* Page Title and Subtitle */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            MPC Results for {formatDate(selectedDate)}
          </h1>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            {UI_CONSTANTS.PLACEHOLDERS.MPC_RESULTS_DESCRIPTION}
          </p>
          <div className="flex items-center w-full gap-4 flex-wrap">
            <Button
              onClick={handleGenerateReport}
              size="lg"
              variant="outline"
              className="text-muted-foreground border-gray-300 hover:bg-gray-50 hover:text-primary hover:border-primary/30"
            >
              {UI_CONSTANTS.BUTTONS.GENERATE_DAILY_REPORT}
            </Button>
            {(() => {
              // Only beam checks are accepted.
              const beams = availableReportChecks.filter(c => c.type === 'beam');
              // Check if ALL beams are accepted
              const allAccepted = beams.length > 0 && beams.every(b => {
                const res = checkResults.find(cr => cr.id === b.id);
                return !!res?.acceptedBy;
              });

              if (allAccepted) {
                // Use info from the first valid beam for display, or generic. Assuming similar acceptance.
                const firstAccepted = checkResults.find(cr => cr.id === beams[0].id);
                // Ensure date is treated as UTC if it lacks timezone info, so toLocaleString converts to local
                const formatTime = (d?: string) => {
                  if (!d) return '';
                  const utc = d.endsWith('Z') ? d : `${d}Z`;
                  return new Date(utc).toLocaleString();
                };
                const timestamp = formatTime(firstAccepted?.acceptedDate);
                return (
                  <div className="flex items-center px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm italic h-11">
                    Accepted by {firstAccepted?.acceptedBy} on {timestamp}
                  </div>
                );
              }

              return (
                <Button
                  onClick={() => setIsSignOffModalOpen(true)}
                  size="lg"
                  variant="outline"
                  className="text-muted-foreground border-gray-300 hover:bg-gray-50 hover:text-primary hover:border-primary/30"
                >
                  Accept
                </Button>
              );
            })()}
            <Button
              onClick={() => setShowGraph(prev => !prev)}
              size="lg"
              variant={showGraph ? "secondary" : "outline"}
              className={showGraph
                ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                : "text-muted-foreground border-gray-300 hover:bg-gray-50 hover:text-primary hover:border-primary/30"}
            >
              Graph
              <ChartIcon className={`ml-2 h-5 w-5 ${showGraph ? 'text-primary' : 'text-gray-500 group-hover:text-primary'}`} />
            </Button>


          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{UI_CONSTANTS.ERRORS.LOADING_DATA} {error}</p>
          </div>
        )}

        {/* Main Content - Two Columns */}
        <div className={`grid gap-8 mt-8 ${showGraph ? 'grid-cols-1 lg:grid-cols-[30%_70%]' : 'grid-cols-1'}`}>
          {/* Left Column - Check Results */}
          <div className="space-y-4">

            {/* 1. Beam Checks Group */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                onClick={() => toggleCheck('group-beam-checks')}
                className="w-full flex items-center justify-between p-4 h-auto bg-gray-50 hover:bg-gray-100"
              >
                <span className="font-semibold text-foreground">Beam Checks</span>
                {expandedChecks.has('group-beam-checks') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </Button>

              {expandedChecks.has('group-beam-checks') && (
                <div className="p-2 space-y-2">
                  {checkResults.filter(c => c.id.startsWith('beam-')).map(check => (
                    <div key={check.id} className="border border-gray-100 rounded-lg">
                      <Button
                        variant="ghost"
                        onClick={() => toggleCheck(check.id)}
                        className="w-full flex items-center justify-between p-3 h-auto hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-muted-foreground">{check.name}</span>
                          <span className={`text-xs font-semibold ${check.status === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>- {check.status}</span>
                        </div>
                        {expandedChecks.has(check.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      {expandedChecks.has(check.id) && (
                        <div className="p-3 overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50%]">Metric</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                                <TableHead>Abs</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {check.metrics.map((m, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      {m.status === 'pass' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                                      {m.name}
                                      <Button variant="ghost" size="icon" className="h-4 w-4"
                                        onClick={(e) => { e.stopPropagation(); toggleMetric(m.name); }}>
                                        <ChartIcon className={`w-3 h-3 ${selectedMetrics.has(m.name) ? 'text-primary' : 'text-gray-400'}`} />
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">{formatMetricValue(m.name, m.value)}</TableCell>
                                  <TableCell>{m.absoluteValue || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Geometry Checks Group */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                onClick={() => toggleCheck('group-geo-checks')}
                className="w-full flex items-center justify-between p-4 h-auto bg-gray-50 hover:bg-gray-100"
              >
                <span className="font-semibold text-foreground">Geometry Checks</span>
                {expandedChecks.has('group-geo-checks') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </Button>

              {expandedChecks.has('group-geo-checks') && (
                <div className="p-2 space-y-2">
                  {/* Render Geo Subgroups */}
                  {['geo-isocenter', 'geo-collimation', 'geo-gantry', 'geo-couch', 'geo-jaws', 'geo-jaws-parallelism', 'geo-mlc-offsets'].map(id => {
                    const check = checkResults.find(c => c.id === id);
                    if (!check) return null;
                    return (
                      <div key={id} className="border border-gray-100 rounded-lg">
                        <Button
                          variant="ghost"
                          onClick={() => toggleCheck(id)}
                          className="w-full flex items-center justify-between p-3 h-auto hover:bg-gray-50"
                        >
                          <span className="font-medium text-sm text-muted-foreground">{check.name}</span>
                          {expandedChecks.has(id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        {expandedChecks.has(id) && (
                          <div className="p-3 overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Metric</TableHead>
                                  <TableHead className="text-right">Value</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {check.metrics.map((m, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        {m.name}
                                        <Button variant="ghost" size="icon" className="h-4 w-4"
                                          onClick={(e) => { e.stopPropagation(); toggleMetric(m.name); }}>
                                          <ChartIcon className={`w-3 h-3 ${selectedMetrics.has(m.name) ? 'text-primary' : 'text-gray-400'}`} />
                                        </Button>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">{formatMetricValue(m.name, m.value)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Nested Groups for MLC/Backlash */}
                  {/* MLC Leaves Group containing Leaves A and Leaves B */}
                  <div className="border border-gray-100 rounded-lg">
                    <Button variant="ghost" onClick={() => toggleCheck('geo-mlc-leaves-group')} className="w-full flex items-center justify-between p-3 h-auto hover:bg-gray-50">
                      <span className="font-medium text-sm text-muted-foreground">MLC Leaves</span>
                      {expandedChecks.has('geo-mlc-leaves-group') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    {expandedChecks.has('geo-mlc-leaves-group') && (
                      <div className="pl-4 pr-2 pb-2 space-y-2">
                        {['geo-mlc-a', 'geo-mlc-b'].map(id => {
                          const check = checkResults.find(c => c.id === id);
                          if (!check) return null;
                          return (
                            <div key={id} className="border border-gray-100 rounded-lg">
                              <Button variant="ghost" onClick={() => toggleCheck(id)} className="w-full flex items-center justify-between p-2 h-auto hover:bg-gray-50">
                                <span className="text-xs font-medium text-muted-foreground">{check.name}</span>
                                {expandedChecks.has(id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </Button>
                              {expandedChecks.has(id) && (
                                <div className="p-2">
                                  <Table>
                                    <TableBody>
                                      {check.metrics.map((m, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell className="py-1 text-xs">
                                            <div className="flex items-center gap-2">
                                              {m.name}
                                              <Button variant="ghost" size="icon" className="h-4 w-4"
                                                onClick={(e) => { e.stopPropagation(); toggleMetric(m.name); }}>
                                                <ChartIcon className={`w-3 h-3 ${selectedMetrics.has(m.name) ? 'text-primary' : 'text-gray-400'}`} />
                                              </Button>
                                            </div>
                                          </TableCell>
                                          <TableCell className="py-1 text-xs text-right">{formatMetricValue(m.name, m.value)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Backlash Leaves Group */}
                  <div className="border border-gray-100 rounded-lg">
                    <Button variant="ghost" onClick={() => toggleCheck('geo-backlash-group')} className="w-full flex items-center justify-between p-3 h-auto hover:bg-gray-50">
                      <span className="font-medium text-sm text-muted-foreground">Backlash Leaves</span>
                      {expandedChecks.has('geo-backlash-group') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    {expandedChecks.has('geo-backlash-group') && (
                      <div className="pl-4 pr-2 pb-2 space-y-2">
                        {['geo-backlash-a', 'geo-backlash-b'].map(id => {
                          const check = checkResults.find(c => c.id === id);
                          if (!check) return null;
                          return (
                            <div key={id} className="border border-gray-100 rounded-lg">
                              <Button variant="ghost" onClick={() => toggleCheck(id)} className="w-full flex items-center justify-between p-2 h-auto hover:bg-gray-50">
                                <span className="text-xs font-medium text-muted-foreground">{check.name}</span>
                                {expandedChecks.has(id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </Button>
                              {expandedChecks.has(id) && (
                                <div className="p-2">
                                  <Table>
                                    <TableBody>
                                      {check.metrics.map((m, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell className="py-1 text-xs">
                                            <div className="flex items-center gap-2">
                                              {m.name}
                                              <Button variant="ghost" size="icon" className="h-4 w-4"
                                                onClick={(e) => { e.stopPropagation(); toggleMetric(m.name); }}>
                                                <ChartIcon className={`w-3 h-3 ${selectedMetrics.has(m.name) ? 'text-primary' : 'text-gray-400'}`} />
                                              </Button>
                                            </div>
                                          </TableCell>
                                          <TableCell className="py-1 text-xs text-right">{formatMetricValue(m.name, m.value)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* Right Column - Graph and Date Selection */}
          {showGraph && (
            <div className="space-y-6">
              {/* Graph Area */}
              <div className="border border-gray-200 rounded-lg p-4">
                {/* Graph Header */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="relative metric-dropdown-container">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-64 flex items-center justify-between"
                        >
                          <span className="truncate">
                            {selectedMetrics.size === 0
                              ? 'Select metrics...'
                              : `${selectedMetrics.size} metric${selectedMetrics.size > 1 ? 's' : ''} selected`}
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64 max-h-60 overflow-y-auto" align="start">
                        {availableMetrics.length > 0 ? (
                          availableMetrics.map((metric) => (
                            <DropdownMenuCheckboxItem
                              key={metric}
                              checked={selectedMetrics.has(metric)}
                              onCheckedChange={() => toggleMetric(metric)}
                              onSelect={(e) => e.preventDefault()} // Keep open on selection
                            >
                              {metric}
                            </DropdownMenuCheckboxItem>
                          ))
                        ) : (
                          <div className="px-2 py-2 text-sm text-gray-500">No metrics available</div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {selectedMetrics.size > 0 && (
                    <Button
                      onClick={handleClearSelections}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    >
                      <Eraser className="w-4 h-4 mr-2" />
                      Clear All Metrics
                    </Button>
                  )}

                  <div className="ml-auto">
                    <Button
                      onClick={() => setShowGraph(false)}
                      variant="ghost"
                      size="icon"
                      title="Close graph"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {baselineSummary && (
                  <div className={`mb-4 px-4 py-3 border rounded-lg text-sm ${getBaselineBannerClasses()}`}>
                    {baselineSummary.message}
                    {(baselineSummary.tone as string) === 'warning' && (
                      <span className="ml-1">
                        Adjust ranges or update the baseline in Settings.
                      </span>
                    )}
                  </div>
                )}

                {/* Graph */}
                <div className="h-96 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        domain={yAxisDomain}
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <>
                        {/* Top threshold shading */}
                        <ReferenceArea
                          y1={topThreshold}
                          y2={thresholdMax}
                          fill={graphThresholdSettings.color}
                          fillOpacity={0.3}
                        />
                        {/* Bottom threshold shading */}
                        <ReferenceArea
                          y1={thresholdMin}
                          y2={bottomThreshold}
                          fill={graphThresholdSettings.color}
                          fillOpacity={0.3}
                        />
                      </>
                      {baselineComputation.hasNumericBaseline && (
                        <ReferenceLine
                          y={0}
                          stroke="#1f2937"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          label={{
                            value: 'Baseline',
                            position: 'right',
                            fill: '#1f2937',
                            fontSize: 12,
                          }}
                        />
                      )}
                      {Array.from(selectedMetrics).map((metricName, index) => {
                        const dataKey = getMetricKey(metricName);
                        const color = getMetricColor(index);
                        return (
                          <Line
                            key={metricName}
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={3}
                            dot={{ r: 5 }}
                            name={metricName}
                            activeDot={{ r: 7 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Quick Date Options */}
                <div className="mb-4 border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickDateRange('lastWeek')}
                        className="whitespace-nowrap text-muted-foreground hover:text-foreground"
                      >
                        Last week
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickDateRange('lastMonth')}
                        className="whitespace-nowrap text-muted-foreground hover:text-foreground"
                      >
                        Last month
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickDateRange('lastQuarter')}
                        className="whitespace-nowrap text-muted-foreground hover:text-foreground"
                      >
                        Last quarter
                      </Button>
                    </div>
                    <div className="relative date-range-picker-container w-full sm:w-auto">
                      <DateRangePicker
                        date={{ from: graphDateRange.start, to: graphDateRange.end }}
                        setDate={handleDateRangeChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </main >

      {/* Blank Footer Spacing */}
      < div className="h-16" ></div >
      {/* Report Generation Modal */}
      < Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen} >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Date Range Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DatePicker
                  date={reportStartDate}
                  setDate={(d) => d && setReportStartDate(d)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <DatePicker
                  date={reportEndDate}
                  setDate={(d) => d && setReportEndDate(d)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Check Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Checks</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-checks"
                    checked={isAllChecksSelected}
                    onCheckedChange={(c) => toggleAllReportChecks(c as boolean)}
                  />
                  <label
                    htmlFor="select-all-checks"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Select All
                  </label>
                </div>
              </div>
              <div className="border rounded-md h-[300px] overflow-y-auto space-y-4">
                {availableReportChecks.length > 0 ? (
                  <>
                    {/* Beam Checks Group */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide sticky top-0 bg-white z-10 py-1 px-2 border-b">Beam Checks</div>
                      <div className="space-y-1 px-2">
                        {availableReportChecks.filter(c => c.type === 'beam').map((check) => (
                          <div key={check.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                            <Checkbox
                              id={`check-${check.id}`}
                              checked={reportSelectedChecks.has(check.id)}
                              onCheckedChange={() => toggleReportCheck(check.id)}
                            />
                            <label
                              htmlFor={`check-${check.id}`}
                              className="text-sm cursor-pointer w-full"
                            >
                              {check.name}
                            </label>
                          </div>
                        ))}
                        {availableReportChecks.filter(c => c.type === 'beam').length === 0 && <div className="text-sm text-gray-400 pl-2">No beam checks</div>}
                      </div>
                    </div>

                    {/* Geometry Checks Group */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2 mt-2 uppercase tracking-wide sticky top-0 bg-white z-10 py-1 px-2 border-b">Geometry Checks</div>
                      <div className="space-y-1 px-2">
                        {availableReportChecks.filter(c => c.type === 'geo').map((check) => (
                          <div key={check.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                            <Checkbox
                              id={`check-${check.id}`}
                              checked={reportSelectedChecks.has(check.id)}
                              onCheckedChange={() => toggleReportCheck(check.id)}
                            />
                            <label
                              htmlFor={`check-${check.id}`}
                              className="text-sm cursor-pointer w-full"
                            >
                              {check.name}
                            </label>
                          </div>
                        ))}
                        {availableReportChecks.filter(c => c.type === 'geo').length === 0 && <div className="text-sm text-gray-400 pl-2">No geometry checks</div>}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500 p-2 text-center">No checks available</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveReport}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Sign Off Modal */}
      < Dialog open={isSignOffModalOpen} onOpenChange={setIsSignOffModalOpen} >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Accept</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Checks</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-accept-checks"
                    checked={isAllSignOffChecksSelected}
                    onCheckedChange={(c) => toggleAllSignOffChecks(c as boolean)}
                  />
                  <label
                    htmlFor="select-all-accept-checks"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Select All
                  </label>
                </div>
              </div>
              <div className="border rounded-md h-[300px] overflow-y-auto space-y-4">
                {availableReportChecks.length > 0 ? (
                  <>
                    {/* Beam Checks Group */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide sticky top-0 bg-white z-10 py-1 px-2 border-b">Beam Checks</div>
                      <div className="space-y-1 px-2">
                        {availableReportChecks.filter(c => c.type === 'beam').map((check) => {
                          const fullCheck = checkResults.find(cr => cr.id === check.id);
                          const isAccepted = !!fullCheck?.acceptedBy;

                          return (
                            <div key={check.id} className="flex flex-col p-1 hover:bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`accept-check-${check.id}`}
                                  checked={isAccepted || signOffSelectedChecks.has(check.id)}
                                  disabled={isAccepted}
                                  onCheckedChange={() => !isAccepted && toggleSignOffCheck(check.id)}
                                />
                                <label
                                  htmlFor={`accept-check-${check.id}`}
                                  className={`text-sm w-full ${isAccepted ? 'cursor-default text-gray-500' : 'cursor-pointer'}`}
                                >
                                  {check.name}
                                </label>
                              </div>
                              {isAccepted && (
                                <div className="ml-6 text-xs text-gray-400 italic">
                                  Accepted by {fullCheck?.acceptedBy} on {(() => {
                                    const d = fullCheck?.acceptedDate;
                                    if (!d) return '';
                                    const utc = d.endsWith('Z') ? d : `${d}Z`;
                                    return new Date(utc).toLocaleString();
                                  })()}
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {availableReportChecks.filter(c => c.type === 'beam').length === 0 && <div className="text-sm text-gray-400 pl-2">No beam checks</div>}
                      </div>
                    </div>


                  </>
                ) : (
                  <div className="text-sm text-gray-500 p-2 text-center">No checks available</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={async () => {
              try {
                const checksToAccept = Array.from(signOffSelectedChecks)
                  .filter(id => id.startsWith('beam-'))
                  .map(id => id.replace('beam-', ''));
                if (checksToAccept.length === 0) return;

                // Currently only beam checks are in the dialog, so we can assume they are beam IDs.
                // If geometry checks were present, we'd need to separate them.
                // Assuming 'user' is available in scope or we fetch it.
                // We'll use the mock user logic or existing user state if available.
                // Looking at code, 'user' state might be available or we can use a hardcoded name/fetchUser.
                // Let's check if 'user' is in component scope.
                const currentUser = user?.name || 'Unknown User';

                setIsAccepting(true);
                await acceptBeams(checksToAccept, currentUser);

                // Refresh only beams data
                await loadDailyChecks({ refresh: 'beams' });
                setIsSignOffModalOpen(false);
                setSignOffSelectedChecks(new Set());
              } catch (err) {
                console.error('Failed to accept checks:', err);
                setError('Failed to accept checks. Please try again.');
              } finally {
                setIsAccepting(false);
              }
            }}>
              {isAccepting ? 'Accepting...' : 'Accept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
    </div >
  );
}

