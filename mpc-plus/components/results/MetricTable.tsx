import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from '../../components/ui';
import { LineChart as ChartIcon } from 'lucide-react';
import type { CheckMetric } from '../../models/CheckResult';
import { formatMetricValue } from '../../lib/transformers/resultTransformers';

interface MetricTableProps {
    metrics: CheckMetric[];
    selectedMetrics: Set<string>;
    onToggleMetric: (metricName: string) => void;
    showAbsolute?: boolean;
}

export const MetricTable: React.FC<MetricTableProps> = ({
    metrics,
    selectedMetrics,
    onToggleMetric,
    showAbsolute = false,
}) => {
    return (
        <div className="p-3 overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50%]">Metric</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        {showAbsolute && <TableHead>Abs</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {metrics.map((m, idx) => (
                        <TableRow key={m.name}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    {m.status === 'pass' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                                    {m.name}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4"
                                        aria-label={`Toggle ${m.name} graph`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleMetric(m.name);
                                        }}
                                    >
                                        <ChartIcon
                                            className={`w-3 h-3 ${selectedMetrics.has(m.name) ? 'text-primary' : 'text-gray-400'}`}
                                        />
                                    </Button>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">{formatMetricValue(m.name, m.value)}</TableCell>
                            {showAbsolute && <TableCell>{m.absoluteValue || '-'}</TableCell>}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};
