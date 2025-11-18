export interface Machine {
  id: string;
  location?: string;
  name: string;
  type?: string;
  status?: 'active' | 'maintenance' | 'inactive' | string;
  lastUpdate?: string; // ISO timestamp
}

export default Machine;
