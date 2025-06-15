import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from 'server/utils/error';
import { ApiHandler } from './api.middleware';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: { id: string; email: string; role: string };
}

export const authMiddleware = (handler: ApiHandler) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as {
        id: string;
        email: string;
        role: string;
      };
      req.user = decoded;
      await handler(req, res);
    } catch (error: unknown) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      throw new AuthenticationError('Failed to authenticate');
    }
  };
};