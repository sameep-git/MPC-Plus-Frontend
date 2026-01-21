export interface Beam {
  id: string;
  type: string;
  date: string; // ISO date
  path?: string;
  relUniformity?: number;
  relOutput?: number;
  centerShift?: number;
  machineId: string;
  note?: string;
  approvedBy?: string;
  approvedDate?: string;
}

export default Beam;
