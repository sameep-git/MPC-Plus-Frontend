import type { Beam } from '../../models/Beam';
import type { GeoCheck } from '../../models/GeoCheck';
import type { CheckResult, CheckMetric } from '../../models/CheckResult';

/**
 * Formats metric values for display.
 */
export const formatMetricValue = (metricName: string, value: string | number): string => {
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


/**
 * Creates a unique beam metric name including the type.
 */
export const createBeamSpecificMetricName = (baseMetricName: string, beamType: string | null): string => {
    if (!beamType) {
        return baseMetricName;
    }
    return `${baseMetricName} (${beamType})`;
};

/**
 * Maps a generic metric key to a safe string for object keys.
 */
export const getMetricKey = (metricName: string): string => {
    return metricName.replace(/[^a-zA-Z0-9]/g, '_');
};

/**
 * Transforms a list of Beam objects into CheckResults for display.
 */
export const mapBeamsToResults = (loadedBeams: Beam[]): CheckResult[] => {
    const beamCheckResults: CheckResult[] = [];

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
            const uniqueId = beam.id ? `beam-${beam.id}` : `beam-${type}-${index}`;

            beamCheckResults.push({
                id: uniqueId,
                name: `Beam Check (${type})`,
                status: 'PASS', // Assuming pass if data exists, logic can be enhanced if status is available
                metrics,
                approvedBy: beam.approvedBy,
                approvedDate: beam.approvedDate
            });
        }
    });

    // Sort beam results to maintain a consistent order
    return beamCheckResults.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
};

/**
 * Transforms a single GeoCheck object into a list of CheckResults (Leaves/Groups).
 */
export const mapGeoCheckToResults = (gc: GeoCheck): CheckResult[] => {
    const geoLeaves: CheckResult[] = [];

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

    return geoLeaves;
};
