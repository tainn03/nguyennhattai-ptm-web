import type { NextApiRequest, NextApiResponse } from 'next';
import { UserUseCase } from 'server/application/user.application';
import { UserRepository } from 'server/domain/repository/user.repository';
import { apiMiddleware } from 'server/middleware/api.middleware';

const userUseCase = new UserUseCase(new UserRepository());

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'POST':
      const { email, name, password } = req.body;
      const user = await userUseCase.register({ email, name, password });
      res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
      break;

    default:
      throw new Error(`Method ${req.method} not allowed`);
  }
}

export default apiMiddleware(handler);