import { Request } from 'express';

export interface AuthRequest extends Request {
  vmId?: string;
  userId?: string;
}

export interface HealthReport {
  hostname: string;
  vmid: string;
  node: string;
  status: 'running' | 'stopped' | 'unknown';
  cpuUsage: number;      // 0-100
  ramUsage: number;      // MB
  ramTotal: number;      // MB
  diskUsage?: number;    // MB
  diskTotal?: number;    // MB
  uptime: number;        // seconds
  timestamp: number;     // Unix timestamp
}

export interface VMStatus {
  id: string;
  hostname: string;
  vmid: string;
  node: string;
  status: 'running' | 'stopped' | 'unknown';
  health: 'healthy' | 'warning' | 'down';
  cpuUsage: number;
  ramUsage: number;
  ramTotal: number;
  ramPercent: number;
  lastHeartbeat: Date;
  isDown: boolean;
  isWarning: boolean;
}

export interface ProxmoxConfig {
  host: string;
  user: string;
  token: string;
  secret: string;
}
