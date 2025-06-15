import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import logger from '../config/logger';
import { DomainError, ValidationError } from 'server/utils/error';

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

export const errorMiddleware = (handler: ApiHandler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const correlationId = req.headers['x-correlation-id'] || Math.random().toString(36).substring(2);

    try {
      await handler(req, res);
    } catch (error) {
      const err = error as Error;
      const status = error instanceof DomainError ? error.status : 500;
      const code = error instanceof DomainError ? error.code : 'INTERNAL_SERVER_ERROR';
      const message = error instanceof DomainError ? error.message : 'Internal server error';
      const details = error instanceof DomainError ? error.details : undefined;

      // Log error with correlation ID
      logger.error({
        correlationId,
        method: req.method,
        url: req.url,
        error: err.message,
        code,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });

      // Handle specific error types
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error.errors);
        res.status(validationError.status).json({
          error: validationError.message,
          code: validationError.code,
          details: validationError.details,
          correlationId,
        });
      } else if (error instanceof DomainError) {
        res.status(status).json({
          error: message,
          code,
          details,
          correlationId,
        });
      } else {
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          correlationId,
        });
      }
    }
  };
};