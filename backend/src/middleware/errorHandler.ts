import { Request, Response, NextFunction } from 'express';
import { logger } from '../index';

export const ErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Unhandled error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: error.details });
  }

  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }

  return res.status(500).json({ error: 'Internal server error' });
};
