'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceArea
} from 'recharts';
import { MdKeyboardArrowDown, MdExpandMore, MdExpandLess, MdTrendingUp, MdDescription, MdShowChart, MdClose } from 'react-icons/md';
import { fetchUser, handleApiError, type User } from '../../lib/api';
import { Navbar, Button } from '../../components/ui';
import { UI_CONSTANTS, CALENDAR_CONSTANTS, GRAPH_CONSTANTS } from '../../constants';

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
  [key: string]: string | number; // Allow dynamic metric keys
}

// Generate mock graph data for multiple metrics
const generateGraphData = (startDate: Date, endDate: Date, selectedMetrics: Set<string>): GraphDataPoint[] => {
  const data: GraphDataPoint[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dataPoint: any = {
      date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
    
    // Generate data for each selected metric
    selectedMetrics.forEach((metricName) => {
      // Create a sanitized key for the metric (remove special characters)
      const key = metricName.replace(/[^a-zA-Z0-9]/g, '_');
      
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get date from URL params or use current date
  const dateParam = searchParams.get('date');
  const selectedDate = dateParam ? new Date(dateParam) : new Date();
  
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
  
  const [dateRangePickerOpen, setDateRangePickerOpen] = useState<boolean>(false);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

  // Threshold settings for graph shading
  const [thresholdTopPercent, setThresholdTopPercent] = useState<number>(GRAPH_CONSTANTS.DEFAULT_THRESHOLD_PERCENT);
  const [thresholdBottomPercent, setThresholdBottomPercent] = useState<number>(GRAPH_CONSTANTS.DEFAULT_THRESHOLD_PERCENT);
  const [thresholdColor, setThresholdColor] = useState<string>(GRAPH_CONSTANTS.DEFAULT_THRESHOLD_COLOR);

  // Mock check results
  const [checkResults] = useState<CheckResult[]>([
    {
      id: 'geometry',
      name: 'Geometry Check',
      status: 'PASS',
      metrics: [],
    },
    {
      id: 'beam-2.5x',
      name: 'Beam Check (2.5x)',
      status: 'PASS',
      metrics: [
        {
          name: 'Output Change (%)',
          value: '',
          thresholds: '',
          absoluteValue: '',
          status: 'pass',
        },
        {
          name: 'Uniformity Change (%)',
          value: '',
          thresholds: '',
          absoluteValue: '',
          status: 'pass',
        },
        {
          name: 'Center Shift',
          value: '',
          thresholds: '',
          absoluteValue: '',
          status: 'pass',
        },
      ],
    },
    {
      id: 'beam-6x',
      name: 'Beam Check (6x)',
      status: 'PASS',
      metrics: [],
    },
    {
      id: 'beam-6xfff',
      name: 'Beam Check (6xFFF)',
      status: 'PASS',
      metrics: [],
    },
    {
      id: 'beam-10x',
      name: 'Beam Check (10x)',
      status: 'PASS',
      metrics: [],
    },
  ]);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (dropdownOpen && !target.closest('.metric-dropdown-container')) {
        setDropdownOpen(false);
      }
      if (dateRangePickerOpen && !target.closest('.date-range-picker-container')) {
        setDateRangePickerOpen(false);
      }
    };

    if (dropdownOpen || dateRangePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dropdownOpen, dateRangePickerOpen]);

  // Initialize temp dates when picker opens
  useEffect(() => {
    if (dateRangePickerOpen) {
      const formatDateForInput = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      setTempStartDate(formatDateForInput(graphDateRange.start));
      setTempEndDate(formatDateForInput(graphDateRange.end));
    }
  }, [dateRangePickerOpen, graphDateRange]);

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
      setDateRangePickerOpen(false);
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
    setDateRangePickerOpen(false);
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
    setDateRangePickerOpen(false);
  };

  const handleGenerateReport = () => {
    console.log('Generating daily report for:', formatDate(selectedDate));
  };

  const weekDays = CALENDAR_CONSTANTS.WEEK_DAYS_SHORT;
  const monthNames = CALENDAR_CONSTANTS.MONTH_NAMES;

  // Calculate Y-axis domain based on selected metrics
  const getYAxisDomain = (): [number, number] => {
    // Use the widest range needed for any selected metric
    if (selectedMetrics.size === 0) {
      return GRAPH_CONSTANTS.Y_AXIS_DOMAINS.DEFAULT as [number, number];
    }
    
    let hasOutputChange = false;
    let hasUniformityChange = false;
    let hasCenterShift = false;
    
    selectedMetrics.forEach((metric) => {
      if (metric.includes('Output Change')) hasOutputChange = true;
      if (metric.includes('Uniformity Change')) hasUniformityChange = true;
      if (metric.includes('Center Shift')) hasCenterShift = true;
    });
    
    // Return the widest range
    if (hasOutputChange) return GRAPH_CONSTANTS.Y_AXIS_DOMAINS.OUTPUT_CHANGE as [number, number];
    if (hasUniformityChange) return GRAPH_CONSTANTS.Y_AXIS_DOMAINS.UNIFORMITY_CHANGE as [number, number];
    if (hasCenterShift) return GRAPH_CONSTANTS.Y_AXIS_DOMAINS.CENTER_SHIFT as [number, number];
    return GRAPH_CONSTANTS.Y_AXIS_DOMAINS.DEFAULT as [number, number];
  };

  // Calculate threshold values for shading
  const getThresholdValues = () => {
    const [min, max] = getYAxisDomain();
    const range = max - min;
    const topThreshold = max - (range * thresholdTopPercent / 100);
    const bottomThreshold = min + (range * thresholdBottomPercent / 100);
    return { topThreshold, bottomThreshold, min, max };
  };

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

  // Sanitize metric name for use as dataKey
  const getMetricKey = (metricName: string): string => {
    return metricName.replace(/[^a-zA-Z0-9]/g, '_');
  };

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
                onClick={() => setDateRangePickerOpen(!dateRangePickerOpen)}
                className="bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[280px]"
              >
                <span className="truncate">
                  {formatDateRange(graphDateRange.start, graphDateRange.end)}
                </span>
                <MdKeyboardArrowDown className={`w-4 h-4 text-gray-600 transition-transform ml-2 flex-shrink-0 ${dateRangePickerOpen ? 'transform rotate-180' : ''}`} />
              </button>
              
              {dateRangePickerOpen && (
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
                      <MdTrendingUp className="w-5 h-5 text-gray-400" />
                      <MdDescription className="w-5 h-5 text-gray-400" />
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
                <button
                  onClick={() => setShowGraph(false)}
                  className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
                  title="Close graph"
                >
                  <MdClose className="w-5 h-5" />
                </button>
              </div>
              
              {/* Graph */}
              <div className="h-96 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graphData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      domain={getYAxisDomain()}
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
                    {(() => {
                      const { topThreshold, bottomThreshold, min, max } = getThresholdValues();
                      return (
                        <>
                          {/* Top threshold shading */}
                          <ReferenceArea
                            y1={topThreshold}
                            y2={max}
                            fill={thresholdColor}
                            fillOpacity={0.3}
                          />
                          {/* Bottom threshold shading */}
                          <ReferenceArea
                            y1={min}
                            y2={bottomThreshold}
                            fill={thresholdColor}
                            fillOpacity={0.3}
                          />
                        </>
                      );
                    })()}
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
              
              {/* Threshold Controls */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Top Threshold (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={thresholdTopPercent}
                      onChange={(e) => setThresholdTopPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Bottom Threshold (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={thresholdBottomPercent}
                      onChange={(e) => setThresholdBottomPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Shading Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={thresholdColor}
                      onChange={(e) => setThresholdColor(e.target.value)}
                      className="h-8 w-16 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={thresholdColor}
                      onChange={(e) => setThresholdColor(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="#fef3c7"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Date Options */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="space-y-2">
                <button
                  onClick={() => handleQuickDateRange('today')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => handleQuickDateRange('yesterday')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  Yesterday
                </button>
                <button
                  onClick={() => handleQuickDateRange('lastWeek')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  Last week
                </button>
                <button
                  onClick={() => handleQuickDateRange('lastMonth')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  Last month
                </button>
                <button
                  onClick={() => handleQuickDateRange('lastQuarter')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  Last quarter
                </button>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-gray-200 pt-8 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Site name</h3>
              <div className="flex space-x-3">
                <a href="#" className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Topic</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900">Page</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900">Page</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900">Page</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Topic</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900">Page</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900">Page</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900">Page</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Topic</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900">Page</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900">Page</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900">Page</a></li>
              </ul>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

