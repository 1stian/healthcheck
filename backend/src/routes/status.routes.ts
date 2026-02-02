import { Router, Request, Response } from 'express';
import { prisma, logger } from '../index';

const router = Router();

/**
 * GET /api/status
 * Get system health and configuration status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });

    const totalVMs = await prisma.vM.count();
    const healthyVMs = await prisma.vM.count({
      where: { isDown: false, isWarning: false },
    });
    const warningVMs = await prisma.vM.count({
      where: { isWarning: true, isDown: false },
    });
    const downVMs = await prisma.vM.count({
      where: { isDown: true },
    });

    res.json({
      timestamp: new Date(),
      vms: {
        total: totalVMs,
        healthy: healthyVMs,
        warning: warningVMs,
        down: downVMs,
      },
      config: {
        staleTimeoutMs: config?.staleTimeoutMs || 300000,
        cpuThreshold: config?.cpuThreshold || 80,
        ramThreshold: config?.ramThreshold || 90,
        autoResetEnabled: config?.autoResetEnabled || true,
        resetRetryCount: config?.resetRetryCount || 3,
      },
    });
  } catch (error) {
    logger.error('Error fetching system status:', error);
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

/**
 * PUT /api/status/config
 * Update system configuration
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const { staleTimeoutMs, cpuThreshold, ramThreshold, autoResetEnabled } = req.body;

    const config = await prisma.systemConfig.upsert({
      where: { id: 'default' },
      update: {
        staleTimeoutMs: staleTimeoutMs || undefined,
        cpuThreshold: cpuThreshold || undefined,
        ramThreshold: ramThreshold || undefined,
        autoResetEnabled: autoResetEnabled !== undefined ? autoResetEnabled : undefined,
      },
      create: {
        id: 'default',
        staleTimeoutMs: staleTimeoutMs || 300000,
        cpuThreshold: cpuThreshold || 80,
        ramThreshold: ramThreshold || 90,
        autoResetEnabled: autoResetEnabled !== false,
      },
    });

    res.json({
      message: 'Configuration updated',
      config,
    });
  } catch (error) {
    logger.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

export default router;
