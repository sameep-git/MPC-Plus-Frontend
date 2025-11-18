export interface UpdateModel {
  id: string;
  machine?: string;
  info?: string;
  type?: string;
  title?: string;
  description?: string;
  date?: string; // ISO date
  priority?: 'low' | 'medium' | 'high' | string;
}

export default UpdateModel;
