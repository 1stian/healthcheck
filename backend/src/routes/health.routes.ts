import { Router, Request, Response } from 'express';
import { healthCheckService } from '../services/healthcheck';
import { HealthReport } from '../types';
import { logger } from '../index';

const router = Router();

/**
 * POST /api/health/report
 * VM submits its health metrics
 */
router.post('/report', async (req: Request, res: Response) => {
  try {
    const report: HealthReport = req.body;

    // Validate required fields
    if (!report.hostname || !report.vmid || !report.node) {
      return res.status(400).json({
        error: 'Missing required fields: hostname, vmid, node',
      });
    }

    // Validate metrics
    if (
      typeof report.cpuUsage !== 'number' ||
      typeof report.ramUsage !== 'number' ||
      typeof report.ramTotal !== 'number'
    ) {
      return res.status(400).json({
        error: 'Invalid metrics format',
      });
    }

    // Process the report
    await healthCheckService.processHealthReport(report);

    res.json({
      success: true,
      message: `Health report received for ${report.hostname}`,
    });
  } catch (error) {
    logger.error('Error processing health report:', error);
    res.status(500).json({ error: 'Failed to process health report' });
  }
});

export default router;
