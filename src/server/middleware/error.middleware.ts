import { Request, Response, NextFunction } from 'express';
     import { DomainError } from '../utils/errors';
     import logger from '../config/logger';

     export const errorMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
       logger.error(`Error: ${error.message}`);
       if (error instanceof DomainError) {
         return res.status(error.code === 'NOT_FOUND' ? 404 : 400).json({ error: error.message });
       }
       res.status(500).json({ error: 'Internal server error' });
     };