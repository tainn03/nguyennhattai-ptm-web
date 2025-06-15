import { NextApiRequest, NextApiResponse } from 'next';
import logger from '../config/logger';
import { errorMiddleware } from './error.middleware';

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

export const apiMiddleware = (handler: ApiHandler) => {
  return errorMiddleware(async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] || Math.random().toString(36).substring(2);

    // Log request
    logger.info({
      correlationId,
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      timestamp: new Date().toISOString(),
    });

    // Add correlation ID to request
    req.headers['x-correlation-id'] = correlationId;

    // Execute handler
    await handler(req, res);

    // Log success
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds

    logger.info({
      correlationId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: duration * 1000,
      timestamp: new Date().toISOString(),
    });
  });
};