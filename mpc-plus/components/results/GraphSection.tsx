import React, { useMemo } from 'react';
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
import { ChevronDown, X, Eraser } from 'lucide-react';
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from '../../components/ui';
import { GRAPH_CONSTANTS } from '../../constants';
import { getSettings } from '../../lib/settings';
import { getDefaultDomainForMetric } from '../../lib/services/graphService';
import { getMetricKey } from '../../lib/transformers/resultTransformers';
import type { GraphDataPoint } from '../../models/Graph';
import { generateGraphData } from '../../lib/services/graphService';
import { useThresholds } from '../../lib/context/ThresholdContext';

interface GraphSectionProps {
    data: GraphDataPoint[];
    selectedMetrics: Set<string>;
    onToggleMetric: (metricName: string) => void;
    onClearMetrics: () => void;
    onClose: () => void;
    availableMetrics: string[];
    machineId: string;
}

export const GraphSection: React.FC<GraphSectionProps> = ({
    data,
    selectedMetrics,
    onToggleMetric,
    onClearMetrics,
    onClose,
    availableMetrics,
    machineId,
}) => {
    const { getThreshold } = useThresholds();

    const baselineSettings = useMemo(() => getSettings().baseline, []);

    // Calculate effective threshold based on selected metrics
    const effectiveThreshold = useMemo(() => {
        if (selectedMetrics.size === 0) return null;

        let minAbsThreshold = Number.POSITIVE_INFINITY;
        let found = false;

        Array.from(selectedMetrics).forEach(metricName => {
            // Parse metric name to determine type and variant
            // Pattern: "Metric Name (Variant)" e.g. "Relative Output (6x)"
            const beamMatch = metricName.match(/^(.*) \((.*)\)$/);

            let checkType: 'beam' | 'geometry' = 'geometry';
            let metricType = metricName;
            let beamVariant: string | undefined = undefined;

            if (beamMatch) {
                checkType = 'beam';
                metricType = beamMatch[1];
                beamVariant = beamMatch[2];
            }

            const val = getThreshold(machineId, checkType, metricType, beamVariant);

            if (val !== null && val !== undefined) {
                found = true;
                minAbsThreshold = Math.min(minAbsThreshold, Math.abs(val));
            }
        });

        return found && Number.isFinite(minAbsThreshold) ? minAbsThreshold : null;
    }, [selectedMetrics, machineId, getThreshold]);

    // Baseline Computation Logic (Migrated from Page)
    const baselineComputation = useMemo(() => {
        const valuesByMetric: Record<string, number | null> = {};
        let baselineDateInRange = false;
        let baselineDataPoint: GraphDataPoint | undefined;

        if (baselineSettings.mode === 'date' && baselineSettings.date) {
            baselineDataPoint = data.find((point) => point.fullDate === baselineSettings.date);
            baselineDateInRange = Boolean(baselineDataPoint);

            if (!baselineDataPoint && selectedMetrics.size > 0) {
                const baselineDate = new Date(baselineSettings.date);
                if (!Number.isNaN(baselineDate.getTime())) {
                    // Using generic generator if point missing
                    const fallbackData = generateGraphData(baselineDate, baselineDate, selectedMetrics);
                    baselineDataPoint = fallbackData[0];
                }
            }
        }

        const { manualValues } = baselineSettings;

        Array.from(selectedMetrics).forEach((metricName) => {
            const key = getMetricKey(metricName);
            let baselineValue: number | null = null;
            const lowerMetric = metricName.toLowerCase();

            if (baselineSettings.mode === 'manual') {
                if (lowerMetric.includes('output change')) baselineValue = manualValues.outputChange;
                else if (lowerMetric.includes('uniformity change')) baselineValue = manualValues.uniformityChange;
                else if (lowerMetric.includes('center shift')) baselineValue = manualValues.centerShift;
                else baselineValue = 0;
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
    }, [baselineSettings, data, selectedMetrics]);

    const chartData = useMemo(() => {
        return data; // Always use raw data (absolute values)
    }, [data]);

    const yAxisDomain = useMemo<[number, number]>(() => {
        if (selectedMetrics.size === 0) return GRAPH_CONSTANTS.Y_AXIS_DOMAINS.DEFAULT as [number, number];

        const metrics = Array.from(selectedMetrics);
        let domainMin = Number.POSITIVE_INFINITY;
        let domainMax = Number.NEGATIVE_INFINITY;

        metrics.forEach((metricName) => {
            const [defaultMin, defaultMax] = getDefaultDomainForMetric(metricName);
            domainMin = Math.min(domainMin, defaultMin);
            domainMax = Math.max(domainMax, defaultMax);
        });

        if (!Number.isFinite(domainMin) || !Number.isFinite(domainMax)) {
            return GRAPH_CONSTANTS.Y_AXIS_DOMAINS.DEFAULT as [number, number];
        }

        // Include data points in domain
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

        // Include baseline values in domain
        if (baselineComputation.hasNumericBaseline) {
            Object.values(baselineComputation.valuesByMetric).forEach(val => {
                if (typeof val === 'number') {
                    domainMin = Math.min(domainMin, val);
                    domainMax = Math.max(domainMax, val);
                }
            });
        }

        if (!Number.isFinite(domainMin) || !Number.isFinite(domainMax)) {
            return GRAPH_CONSTANTS.Y_AXIS_DOMAINS.DEFAULT as [number, number];
        }

        // Ensure domain includes the threshold if it exists
        if (effectiveThreshold !== null) {
            const safeBuffer = 0.5; // Ensure we see past the threshold
            domainMax = Math.max(domainMax, effectiveThreshold + safeBuffer);
            domainMin = Math.min(domainMin, -effectiveThreshold - safeBuffer);
        }

        // Add padding
        const range = domainMax - domainMin;
        const padding = Math.max(range * 0.1, 0.1); // at least 0.1 padding

        return [domainMin - padding, domainMax + padding];
    }, [chartData, selectedMetrics, effectiveThreshold, baselineComputation]);


    const getMetricColor = (index: number): string => {
        return GRAPH_CONSTANTS.METRIC_COLORS[index % GRAPH_CONSTANTS.METRIC_COLORS.length];
    };

    const baselineSummary = useMemo(() => {
        if (baselineSettings.mode === 'date') {
            if (!baselineSettings.date) {
                return {
                    message: 'Select a baseline date in Settings to see reference lines.',
                    tone: 'muted' as const,
                };
            }

            if (selectedMetrics.size > 0) {
                return {
                    message: `Baseline from ${baselineSettings.date}. Dashed lines show baseline values.`,
                    tone: 'info' as const,
                };
            }

            return {
                message: `Baseline from ${baselineSettings.date}. Select metrics to view.`,
                tone: 'muted' as const,
            };
        }

        const { manualValues } = baselineSettings;
        return {
            message: `Baseline uses manual values.`,
            tone: 'info' as const,
        };
    }, [baselineSettings, selectedMetrics.size]);

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

    return (
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
                                        onCheckedChange={() => onToggleMetric(metric)}
                                        onSelect={(e) => e.preventDefault()}
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
                        onClick={onClearMetrics}
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
                        onClick={onClose}
                        variant="ghost"
                        size="icon"
                        title="Close graph"
                        aria-label="Close graph"
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
                            {effectiveThreshold !== null && (
                                <>
                                    {/* Top Warning Zone (Threshold - 0.1 to Threshold) */}
                                    <ReferenceArea
                                        y1={effectiveThreshold - 0.1}
                                        y2={effectiveThreshold}
                                        fill="#f59e0b" // Amber
                                        fillOpacity={0.2}
                                    />
                                    {/* Top Fail Zone (Threshold upwards) */}
                                    <ReferenceArea
                                        y1={effectiveThreshold}
                                        y2={yAxisDomain[1]} // Extend to top of graph
                                        fill="#ef4444" // Red
                                        fillOpacity={0.2}
                                    />

                                    {/* Bottom Warning Zone (-Threshold to -Threshold + 0.1) */}
                                    <ReferenceArea
                                        y1={-effectiveThreshold}
                                        y2={-effectiveThreshold + 0.1}
                                        fill="#f59e0b" // Amber
                                        fillOpacity={0.2}
                                    />
                                    {/* Bottom Fail Zone (-Threshold downwards) */}
                                    <ReferenceArea
                                        y1={yAxisDomain[0]} // Extend to bottom of graph
                                        y2={-effectiveThreshold}
                                        fill="#ef4444" // Red
                                        fillOpacity={0.2}
                                    />

                                    {/* Explicit Lines for Threshold */}
                                    <ReferenceLine y={effectiveThreshold} stroke="#ef4444" strokeDasharray="3 3" />
                                    <ReferenceLine y={-effectiveThreshold} stroke="#ef4444" strokeDasharray="3 3" />
                                </>
                            )}
                        </>
                        {/* Reference lines for each metric's baseline */}
                        {Array.from(selectedMetrics).map((metricName, index) => {
                            const key = getMetricKey(metricName);
                            const baselineVal = baselineComputation.valuesByMetric[key];
                            if (typeof baselineVal !== 'number') return null;

                            const color = getMetricColor(index);
                            return (
                                <ReferenceLine
                                    key={`baseline-${metricName}`}
                                    y={baselineVal}
                                    stroke={color}
                                    strokeDasharray="5 5"
                                    opacity={0.6}
                                    label={{
                                        position: 'right',
                                        value: 'B',
                                        fill: color,
                                        fontSize: 10
                                    }}
                                />
                            );
                        })}
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
        </div>
    );
};
