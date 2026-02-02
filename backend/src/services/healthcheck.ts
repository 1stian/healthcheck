import { prisma, logger } from '../index';
import { HealthReport, VMStatus } from '../types';

export class HealthCheckService {
  async processHealthReport(report: HealthReport): Promise<void> {
    try {
      // Find or create VM
      let vm = await prisma.vM.findUnique({
        where: { hostname: report.hostname },
      });

      if (!vm) {
        vm = await prisma.vM.create({
          data: {
            hostname: report.hostname,
            vmid: report.vmid,
            node: report.node,
            status: report.status,
            cpuUsage: report.cpuUsage,
            ramUsage: report.ramUsage,
            ramTotal: report.ramTotal,
            diskUsage: report.diskUsage,
            diskTotal: report.diskTotal,
            uptime: report.uptime,
            lastHeartbeat: new Date(),
          },
        });
        logger.info(`New VM registered: ${report.hostname}`);
      } else {
        // Update VM metrics
        const ramPercent = (report.ramUsage / report.ramTotal) * 100;
        const config = await prisma.systemConfig.findUnique({
          where: { id: 'default' },
        });

        const cpuThreshold = config?.cpuThreshold || 80;
        const ramThreshold = config?.ramThreshold || 90;

        vm = await prisma.vM.update({
          where: { id: vm.id },
          data: {
            status: report.status,
            cpuUsage: report.cpuUsage,
            ramUsage: report.ramUsage,
            ramTotal: report.ramTotal,
            diskUsage: report.diskUsage,
            diskTotal: report.diskTotal,
            uptime: report.uptime,
            lastHeartbeat: new Date(),
            isDown: false,
            isWarning: report.cpuUsage > cpuThreshold || ramPercent > ramThreshold,
          },
        });
      }

      // Record metric
      await prisma.vMMetric.create({
        data: {
          vmId: vm.id,
          cpuUsage: report.cpuUsage,
          ramUsage: report.ramUsage,
          ramTotal: report.ramTotal,
          diskUsage: report.diskUsage,
          diskTotal: report.diskTotal,
          uptime: report.uptime,
        },
      });

      logger.info(`Health report processed for ${report.hostname}`);
    } catch (error) {
      logger.error(`Error processing health report for ${report.hostname}:`, error);
      throw error;
    }
  }

  async checkStaleVMs(): Promise<void> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { id: 'default' },
      });

      const staleTimeoutMs = config?.staleTimeoutMs || 300000; // 5 minutes
      const staleThreshold = new Date(Date.now() - staleTimeoutMs);

      // Mark VMs as down if no heartbeat
      await prisma.vM.updateMany({
        where: {
          lastHeartbeat: {
            lt: staleThreshold,
          },
          isDown: false,
        },
        data: {
          isDown: true,
          status: 'unknown',
        },
      });

      logger.info('Stale VM check completed');
    } catch (error) {
      logger.error('Error checking stale VMs:', error);
      throw error;
    }
  }

  async getVMStatus(vmId: string): Promise<VMStatus | null> {
    try {
      const vm = await prisma.vM.findUnique({
        where: { id: vmId },
      });

      if (!vm) return null;

      const ramPercent = vm.ramTotal > 0 ? (vm.ramUsage / vm.ramTotal) * 100 : 0;
      let health: 'healthy' | 'warning' | 'down' = 'healthy';

      if (vm.isDown) {
        health = 'down';
      } else if (vm.isWarning) {
        health = 'warning';
      }

      return {
        id: vm.id,
        hostname: vm.hostname,
        vmid: vm.vmid,
        node: vm.node,
        status: vm.status as 'running' | 'stopped' | 'unknown',
        health,
        cpuUsage: vm.cpuUsage,
        ramUsage: vm.ramUsage,
        ramTotal: vm.ramTotal,
        ramPercent,
        lastHeartbeat: vm.lastHeartbeat,
        isDown: vm.isDown,
        isWarning: vm.isWarning,
      };
    } catch (error) {
      logger.error('Error getting VM status:', error);
      return null;
    }
  }

  async getAllVMStatus(): Promise<VMStatus[]> {
    try {
      const vms = await prisma.vM.findMany({
        orderBy: { hostname: 'asc' },
      });

      return vms.map((vm) => {
        const ramPercent = vm.ramTotal > 0 ? (vm.ramUsage / vm.ramTotal) * 100 : 0;
        let health: 'healthy' | 'warning' | 'down' = 'healthy';

        if (vm.isDown) {
          health = 'down';
        } else if (vm.isWarning) {
          health = 'warning';
        }

        return {
          id: vm.id,
          hostname: vm.hostname,
          vmid: vm.vmid,
          node: vm.node,
          status: vm.status as 'running' | 'stopped' | 'unknown',
          health,
          cpuUsage: vm.cpuUsage,
          ramUsage: vm.ramUsage,
          ramTotal: vm.ramTotal,
          ramPercent,
          lastHeartbeat: vm.lastHeartbeat,
          isDown: vm.isDown,
          isWarning: vm.isWarning,
        };
      });
    } catch (error) {
      logger.error('Error getting all VM statuses:', error);
      return [];
    }
  }

  async getVMMetrics(vmId: string, hours: number = 24): Promise<any[]> {
    try {
      const since = new Date(Date.now() - hours * 3600000);

      const metrics = await prisma.vMMetric.findMany({
        where: {
          vmId,
          timestamp: {
            gte: since,
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      return metrics;
    } catch (error) {
      logger.error('Error getting VM metrics:', error);
      return [];
    }
  }
}

export const healthCheckService = new HealthCheckService();
