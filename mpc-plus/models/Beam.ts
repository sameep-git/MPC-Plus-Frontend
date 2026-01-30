export interface Beam {
  id: string;
  type: string;
  date: string; // ISO date
  timestamp?: string; // ISO datetime
  path?: string;
  relUniformity?: number;
  relOutput?: number;
  centerShift?: number;
  machineId: string;
  note?: string;
  approvedBy?: string;
  approvedDate?: string;

  // Status fields from backend
  status?: string;
  relOutputStatus?: string;
  relUniformityStatus?: string;
  centerShiftStatus?: string;
}

export default Beam;
