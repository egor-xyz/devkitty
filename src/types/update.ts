export type UpdateState = {
  error?: string;
  status: 'available' | 'downloading' | 'error' | 'idle' | 'ready';
  version?: string;
};
