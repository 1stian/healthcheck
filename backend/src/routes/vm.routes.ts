import { Router, Request, Response } from 'express';
import { healthCheckService } from '../services/healthcheck';
import { ProxmoxClient } from '../services/proxmox';
import { prisma, logger } from '../index';

const router = Router();

// Initialize Proxmox client
const proxmox = new ProxmoxClient(
  process.env.PROXMOX_HOST || 'https://localhost:8006',
  process.env.PROXMOX_USER || 'root@pam',
  process.env.PROXMOX_TOKEN || '',
  process.env.PROXMOX_SECRET || ''
);

/**
 * GET /api/vms
 * List all VMs with their current status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const vms = await healthCheckService.getAllVMStatus();
    res.json(vms);
  } catch (error) {
    logger.error('Error fetching VMs:', error);
    res.status(500).json({ error: 'Failed to fetch VMs' });
  }
});

/**
 * GET /api/vms/:id
 * Get specific VM details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const vmStatus = await healthCheckService.getVMStatus(req.params.id);

    if (!vmStatus) {
      return res.status(404).json({ error: 'VM not found' });
    }

    res.json(vmStatus);
  } catch (error) {
    logger.error('Error fetching VM:', error);
    res.status(500).json({ error: 'Failed to fetch VM' });
  }
});

/**
 * GET /api/vms/:id/metrics
 * Get VM metrics history
 */
router.get('/:id/metrics', async (req: Request, res: Response) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
    const metrics = await healthCheckService.getVMMetrics(req.params.id, hours);
    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching VM metrics:', error);
    res.status(500).json({ error: 'Failed to fetch VM metrics' });
  }
});

/**
 * POST /api/vms/:id/reset
 * Send reset command to unresponsive VM
 */
router.post('/:id/reset', async (req: Request, res: Response) => {
  try {
    const vm = await prisma.vM.findUnique({
      where: { id: req.params.id },
    });

    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }

    const config = await prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });

    const maxRetries = config?.resetRetryCount || 3;

    if (vm.resetAttempts >= maxRetries) {
      return res.status(400).json({
        error: `Maximum reset attempts (${maxRetries}) reached for this VM`,
      });
    }

    try {
      // Send reset command via Proxmox
      const result = await proxmox.resetVM(vm.node, vm.vmid);

      // Update reset history
      await prisma.resetHistory.create({
        data: {
          vmId: vm.id,
          reason: req.body.reason || 'Manual reset triggered',
          proxmoxResponse: JSON.stringify(result),
          success: true,
        },
      });

      // Increment reset attempts
      await prisma.vM.update({
        where: { id: vm.id },
        data: {
          resetAttempts: vm.resetAttempts + 1,
          lastReset: new Date(),
        },
      });

      res.json({
        success: true,
        message: `Reset command sent to ${vm.hostname}`,
        resetAttempts: vm.resetAttempts + 1,
      });
    } catch (proxmoxError) {
      logger.error('Proxmox reset failed:', proxmoxError);

      // Log failed reset attempt
      await prisma.resetHistory.create({
        data: {
          vmId: vm.id,
          reason: req.body.reason || 'Manual reset triggered',
          proxmoxResponse: JSON.stringify(proxmoxError),
          success: false,
        },
      });

      res.status(500).json({
        error: 'Failed to send reset command to Proxmox',
        details: (proxmoxError as any).message,
      });
    }
  } catch (error) {
    logger.error('Error processing reset request:', error);
    res.status(500).json({ error: 'Failed to process reset request' });
  }
});

/**
 * GET /api/vms/:id/reset-history
 * Get VM reset history
 */
router.get('/:id/reset-history', async (req: Request, res: Response) => {
  try {
    const history = await prisma.resetHistory.findMany({
      where: { vmId: req.params.id },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    res.json(history);
  } catch (error) {
    logger.error('Error fetching reset history:', error);
    res.status(500).json({ error: 'Failed to fetch reset history' });
  }
});

export default router;
