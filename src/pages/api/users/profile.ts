import { NextApiResponse } from "next";
import { UserUseCase } from "server/application/user.application";
import { UserRepository } from "server/domain/repository/user.repository";
import { apiMiddleware } from "server/middleware/api.middleware";
import { AuthenticatedRequest, authMiddleware } from "server/middleware/auth.middleware";


const userUseCase = new UserUseCase(new UserRepository());

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.user!.id;

  switch (req.method) {
    case 'GET':
      const user = await userUseCase.getProfile(userId);
      res.status(200).json({ id: user.id, email: user.email, name: user.name, role: user.role });
      break;

    case 'PUT':
      const updatedUser = await userUseCase.updateProfile(userId, req.body);
      res.status(200).json({ id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role });
      break;

    default:
      throw new Error(`Method ${req.method} not allowed`);
  }
}

export default apiMiddleware(authMiddleware(handler));