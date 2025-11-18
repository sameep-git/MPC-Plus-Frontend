export interface Threshold {
  machineId: string;
  checkType: 'geometry' | 'beam';
  beamVariant?: string;
  metricType: 'output_change' | 'uniformity_change' | 'center_shift' | string;
  lastUpdated: string; // ISO date-time
  value?: number;
}

export default Threshold;
