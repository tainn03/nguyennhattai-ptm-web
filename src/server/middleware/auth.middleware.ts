import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to include 'user'
interface AuthenticatedRequest extends Request {
    userId?: number;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const decoded = jwt.verify(token, 'your_jwt_secret');
        let userId: number | undefined;
        if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
            userId = (decoded as { userId?: number }).userId;
        }
        if (!userId) {
            res.status(401).json({ error: 'Invalid token payload' });
            return;
        }
        req.userId = userId; // Attach user ID to request
        next();
    } catch (error: unknown) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};