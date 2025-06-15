import jwt from 'jsonwebtoken';
import { ApiHandler, apiMiddleware } from './api.middleware';
import { NextApiRequest, NextApiResponse } from 'next';

// Extend Express Request to include 'user'
interface AuthenticatedRequest extends NextApiRequest {
    userId?: string;
}

export const authMiddleware = (handler: ApiHandler) => {
    return async (req: AuthenticatedRequest, res: NextApiResponse) => {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        let userId: string | undefined;
        if (typeof payload === 'object' && payload !== null && 'userId' in payload) {
          userId = (payload as jwt.JwtPayload).userId as string;
        }
        req.userId = userId;
        return apiMiddleware(handler)(req, res);
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    };
  };