'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { MdKeyboardArrowDown, MdExpandMore, MdExpandLess, MdTrendingUp, MdDescription, MdShowChart, MdClose, MdClear } from 'react-icons/md';
import { fetchUser, handleApiError } from '../../lib/api';
import { Navbar, Button } from '../../components/ui';
import { UI_CONSTANTS, CALENDAR_CONSTANTS, GRAPH_CONSTANTS } from '../../constants';
import { getSettings } from '../../lib/settings';

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
}

// Mock data for graph
interface GraphDataPoint {
  date: string;
  fullDate: string;
  [key: string]: string | number; // Allow dynamic metric keys
}

// Generate mock graph data for multiple metrics
const generateGraphData = (startDate: Date, endDate: Date, selectedMetrics: Set<string>): GraphDataPoint[] => {
  const data: GraphDataPoint[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const isoDate = currentDate.toISOString().split('T')[0];
    const dataPoint: GraphDataPoint = {
      date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: isoDate,
    };
    
    // Generate data for each selected metric
    selectedMetrics.forEach((metricName) => {
      // Create a sanitized key for the metric (remove special characters)
      const key = getMetricKey(metricName);
      
      // Generate value based on metric type
      let value = Math.random() * 12 - 6;
      if (metricName.includes('Output Change')) {
        value = Math.random() * 10 - 5; // -5 to 5 range
      } else if (metricName.includes('Uniformity Change')) {
        value = Math.random() * 8 - 4; // -4 to 4 range
      } else if (metricName.includes('Center Shift')) {
        value = Math.random() * 6 - 3; // -3 to 3 range
      }
      
      dataPoint[key] = value;
    });
    
    data.push(dataPoint);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
};

export default function ResultDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get date from URL params or use current date
  const dateParam = searchParams.get('date');
  const selectedDate = dateParam ? new Date(dateParam) : new Date();
  
  // Remove date query parameter from URL after reading it
  useEffect(() => {
    if (dateParam && typeof window !== 'undefined') {
      // Replace the URL without the query parameter
      router.replace('/result-detail', { scroll: false });
    }
  }, [dateParam, router]);
  
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set(['beam-2.5x']));
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [showGraph, setShowGraph] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  
  // Date range for graph
  const [graphDateRange, setGraphDateRange] = useState<{ start: Date; end: Date }>(() => {
    const end = new Date(selectedDate);
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - 14); // 14 days before
    return { start, end };
  });
  
  const [activeDateRangePicker, setActiveDateRangePicker] = useState<'header' | 'quick' | null>(null);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

  // Threshold settings for graph shading sourced from global settings
  const [graphThresholdSettings, setGraphThresholdSettings] = useState(() => getGraphThresholdSettings());
  const [baselineSettings, setBaselineSettings] = useState(() => getBaselineSettingsSnapshot());

  // Base metric names (without beam type)
  const baseMetricNames = [
    'Output Change (%)',
    'Uniformity Change (%)',
    'Center Shift',
  ];

  // Create check results with beam-specific metric names
  const createCheckResults = (): CheckResult[] => {
    const results: CheckResult[] = [
      {
        id: 'geometry',
        name: 'Geometry Check',
        status: 'PASS',
        metrics: [],
      },
    ];

    // Add beam checks with beam-specific metrics
    const beamIds = ['beam-2.5x', 'beam-6x', 'beam-6xfff', 'beam-10x'];
    beamIds.forEach((beamId) => {
      const beamType = getBeamTypeFromCheckId(beamId);
      const beamName = beamType ? `Beam Check (${beamType})` : `Beam Check`;
      
      const metrics: CheckMetric[] = baseMetricNames.map((baseName) => ({
        name: createBeamSpecificMetricName(baseName, beamType),
        value: '',
        thresholds: '',
        absoluteValue: '',
        status: 'pass' as const,
      }));

      results.push({
        id: beamId,
        name: beamName,
        status: 'PASS',
        metrics,
      });
    });

    return results;
  };

  // Mock check results
  const [checkResults] = useState<CheckResult[]>(createCheckResults());

  const [graphData, setGraphData] = useState<GraphDataPoint[]>(() => 
    generateGraphData(graphDateRange.start, graphDateRange.end, new Set())
  );

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

  useEffect(() => {
    setGraphData(generateGraphData(graphDateRange.start, graphDateRange.end, selectedMetrics));
  }, [graphDateRange.start.getTime(), graphDateRange.end.getTime(), selectedMetrics]);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (dropdownOpen && !target.closest('.metric-dropdown-container')) {
        setDropdownOpen(false);
      }
      if (activeDateRangePicker && !target.closest('.date-range-picker-container')) {
        setActiveDateRangePicker(null);
      }
    };

    if (dropdownOpen || activeDateRangePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dropdownOpen, activeDateRangePicker]);

  // Initialize temp dates when picker opens
  useEffect(() => {
    if (activeDateRangePicker) {
      const formatDateForInput = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      setTempStartDate(formatDateForInput(graphDateRange.start));
      setTempEndDate(formatDateForInput(graphDateRange.end));
    }
  }, [activeDateRangePicker, graphDateRange]);

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

  const handleDateRangeApply = () => {
    if (tempStartDate && tempEndDate) {
      const start = new Date(tempStartDate);
      const end = new Date(tempEndDate);
      
      // Ensure start is before end
      if (start > end) {
        // Swap if start is after end
        setGraphDateRange({ start: end, end: start });
      } else {
        setGraphDateRange({ start, end });
      }
      setActiveDateRangePicker(null);
    }
  };

  const handleDateRangeCancel = () => {
    // Reset temp dates to current range
    const formatDateForInput = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    setTempStartDate(formatDateForInput(graphDateRange.start));
    setTempEndDate(formatDateForInput(graphDateRange.end));
    setActiveDateRangePicker(null);
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
    setActiveDateRangePicker(null);
  };

  const handleGenerateReport = () => {
    console.log('Generating daily report for:', formatDate(selectedDate));
  };

  const weekDays = CALENDAR_CONSTANTS.WEEK_DAYS_SHORT;
  const monthNames = CALENDAR_CONSTANTS.MONTH_NAMES;

  // Calculate Y-axis domain based on selected metrics and data

  // Get all available metrics from all beams
  const getAllAvailableMetrics = (): string[] => {
    const metricsSet = new Set<string>();
    checkResults.forEach(check => {
      check.metrics.forEach(metric => {
        metricsSet.add(metric.name);
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
        return 'bg-gray-50 border-gray-200 text-gray-600';
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
      <div className="min-h-screen bg-white">
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
    <div className="min-h-screen bg-white">
      <Navbar user={user} />
      
      <main className="p-6 max-w-7xl mx-auto">
        {/* Page Title and Subtitle */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            MPC Results for {formatDate(selectedDate)}
          </h1>
          <p className="text-gray-600 mb-6 max-w-2xl">
            {UI_CONSTANTS.PLACEHOLDERS.MPC_RESULTS_DESCRIPTION}
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Button onClick={handleGenerateReport} size="lg">
              {UI_CONSTANTS.BUTTONS.GENERATE_DAILY_REPORT}
            </Button>
            {/* Date Range Picker Dropdown */}
            <div className="relative date-range-picker-container">
              <button
                onClick={() => setActiveDateRangePicker(prev => (prev === 'header' ? null : 'header'))}
                className="bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[280px]"
              >
                <span className="truncate">
                  {formatDateRange(graphDateRange.start, graphDateRange.end)}
                </span>
                <MdKeyboardArrowDown className={`w-4 h-4 text-gray-600 transition-transform ml-2 flex-shrink-0 ${activeDateRangePicker === 'header' ? 'transform rotate-180' : ''}`} />
              </button>
              
              {activeDateRangePicker === 'header' && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[280px]">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={tempStartDate}
                        onChange={(e) => setTempStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={tempEndDate}
                        onChange={(e) => setTempEndDate(e.target.value)}
                        min={tempStartDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleDateRangeApply}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={handleDateRangeCancel}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
            {checkResults.map((check) => {
              const isExpanded = expandedChecks.has(check.id);
              const statusColor = check.status === 'PASS' ? 'text-green-600' : 
                                  check.status === 'FAIL' ? 'text-red-600' : 'text-yellow-600';
              
              return (
                <div key={check.id} className="border border-gray-200 rounded-lg">
                  {/* Check Header */}
                  <button
                    onClick={() => toggleCheck(check.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">{check.name}</span>
                      <span className={`font-semibold ${statusColor}`}>- {check.status}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isExpanded ? (
                        <MdExpandLess className="w-6 h-6 text-gray-600" />
                      ) : (
                        <MdExpandMore className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                  </button>
                  
                  {/* Check Details Table */}
                  {isExpanded && check.metrics.length > 0 && (
                    <div className="border-t border-gray-200 p-4">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Value</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Thresholds</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Absolute Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {check.metrics.map((metric, index) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-2 px-3">
                                <div className="flex items-center space-x-2">
                                  {metric.status === 'pass' && (
                                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  )}
                                  <span className="text-sm text-gray-900">{metric.name}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedMetrics(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(metric.name)) {
                                          newSet.delete(metric.name);
                                        } else {
                                          newSet.add(metric.name);
                                        }
                                        return newSet;
                                      });
                                      setShowGraph(true);
                                    }}
                                    className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                                      selectedMetrics.has(metric.name) ? 'text-purple-600 bg-purple-50' : 'text-gray-400'
                                    }`}
                                    title={`${selectedMetrics.has(metric.name) ? 'Remove' : 'Add'} graph for ${metric.name}`}
                                  >
                                    <MdShowChart className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-600">{metric.thresholds || '-'}</td>
                              <td className="py-2 px-3 text-sm text-gray-600">{metric.absoluteValue || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column - Graph and Date Selection */}
          {showGraph && (
          <div className="space-y-6">
            {/* Graph Area */}
            <div className="border border-gray-200 rounded-lg p-4">
              {/* Graph Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="relative metric-dropdown-container">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-lg text-sm w-64 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <span className="truncate">
                      {selectedMetrics.size === 0 
                        ? 'Select metrics...' 
                        : `${selectedMetrics.size} metric${selectedMetrics.size > 1 ? 's' : ''} selected`}
                    </span>
                    <MdKeyboardArrowDown className={`w-4 h-4 text-gray-600 transition-transform ${dropdownOpen ? 'transform rotate-180' : ''}`} />
                  </button>
                  
                  {dropdownOpen && (
                    <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {availableMetrics.length > 0 ? (
                        <div className="py-2">
                          {availableMetrics.map((metric) => (
                            <label
                              key={metric}
                              className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedMetrics.has(metric)}
                                onChange={() => toggleMetric(metric)}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              />
                              <span className="ml-3 text-sm text-gray-900">{metric}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">No metrics available</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearSelections}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
                    title="Clear all selections"
                    disabled={selectedMetrics.size === 0}
                  >
                    <MdClear className="w-4 h-4" />
                    Clear
                  </button>
                  <button
                    onClick={() => setShowGraph(false)}
                    className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
                    title="Close graph"
                  >
                    <MdClose className="w-5 h-5" />
                  </button>
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
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleQuickDateRange('today')}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors whitespace-nowrap"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleQuickDateRange('yesterday')}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors whitespace-nowrap"
                  >
                    Yesterday
                  </button>
                  <button
                    onClick={() => handleQuickDateRange('lastWeek')}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors whitespace-nowrap"
                  >
                    Last week
                  </button>
                  <button
                    onClick={() => handleQuickDateRange('lastMonth')}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors whitespace-nowrap"
                  >
                    Last month
                  </button>
                  <button
                    onClick={() => handleQuickDateRange('lastQuarter')}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors whitespace-nowrap"
                  >
                    Last quarter
                  </button>
                  <div className="relative date-range-picker-container">
                    <button
                      onClick={() => {
                        if (activeDateRangePicker === 'quick') {
                          setActiveDateRangePicker(null);
                          return;
                        }
                        const end = new Date();
                        const start = new Date();
                        start.setMonth(start.getMonth() - 3);
                        setGraphDateRange({ start, end });
                        setActiveDateRangePicker('quick');
                      }}
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors whitespace-nowrap border border-gray-300 bg-white flex items-center gap-2"
                    >
                      <span>Custom range</span>
                      <span className="text-xs text-gray-500">
                        {formatDateRange(graphDateRange.start, graphDateRange.end)}
                      </span>
                      <MdKeyboardArrowDown className={`w-4 h-4 text-gray-500 transition-transform ${activeDateRangePicker === 'quick' ? 'transform rotate-180' : ''}`} />
                    </button>

                    {activeDateRangePicker === 'quick' && (
                      <div className="absolute z-10 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[280px]">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={tempStartDate}
                              onChange={(e) => setTempStartDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              End Date
                            </label>
                            <input
                              type="date"
                              value={tempEndDate}
                              onChange={(e) => setTempEndDate(e.target.value)}
                              min={tempStartDate}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={handleDateRangeApply}
                              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                            >
                              Apply
                            </button>
                            <button
                              onClick={handleDateRangeCancel}
                              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
          )}
        </div>
      </main>
      
      {/* Blank Footer Spacing */}
      <div className="h-16"></div>
    </div>
  );
}

