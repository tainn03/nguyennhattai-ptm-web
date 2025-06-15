import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { DomainError } from '../utils/error';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`Error: ${error.message}`);
    if (error instanceof DomainError) {
        res.status(error.code === 'NOT_FOUND' ? 404 : 400).json({ error: error.message });
        return;
    }
    res.status(500).json({ error: 'Internal server error' });
};