import type { NextApiRequest, NextApiResponse } from 'next';
import { UserUseCase } from 'server/application/user.application';
import { UserRepository } from 'server/domain/repository/user.repository';
import { apiMiddleware } from 'server/middleware/api.middleware';

const userUseCase = new UserUseCase(new UserRepository());

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    throw new Error(`Method ${req.method} not allowed`);
  }

  const { email, password } = req.body;
  const { token, user } = await userUseCase.login(email, password);
  res.status(200).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}

export default apiMiddleware(handler);