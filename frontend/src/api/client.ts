import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

export const vmAPI = {
  listVMs: () => apiClient.get('/vms'),
  getVM: (id: string) => apiClient.get(`/vms/${id}`),
  getVMMetrics: (id: string, hours: number = 24) =>
    apiClient.get(`/vms/${id}/metrics`, { params: { hours } }),
  resetVM: (id: string, reason: string = '') =>
    apiClient.post(`/vms/${id}/reset`, { reason }),
  getResetHistory: (id: string) => apiClient.get(`/vms/${id}/reset-history`),
};

export const statusAPI = {
  getStatus: () => apiClient.get('/status'),
  updateConfig: (config: any) => apiClient.put('/status/config', config),
};
