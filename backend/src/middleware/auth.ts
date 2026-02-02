import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';

export const AuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  // Validate API key against registered VMs
  // This will be verified against the database in the actual implementation
  req.vmId = apiKey; // Placeholder - actual validation in routes

  next();
};

export const OptionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    req.vmId = apiKey;
  }
  next();
};
