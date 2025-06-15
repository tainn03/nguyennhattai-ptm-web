import type { NextApiResponse } from 'next';
import { apiMiddleware } from '../../../server/middleware/api.middleware';
import { TaskApplication } from 'server/application/task.application';
import { TaskRepository } from 'server/domain/repository/task.repository';
import { TaskStatus } from 'server/domain/entity/task.entity'; // Add this import
import { AuthenticatedRequest, authMiddleware } from 'server/middleware/auth.middleware';
import { createTaskSchema } from 'server/controller/validator/task.validation';

const taskUseCase = new TaskApplication(new TaskRepository());

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.user!.id;

  switch (req.method) {
    case 'GET':
      const tasks = await taskUseCase.getAllTasks();
      res.status(200).json(tasks);
      break;

    case 'POST':
      const validatedData = createTaskSchema.parse(req.body);
      const dataForDomain = {
        ...validatedData,
        status: validatedData.status as unknown as TaskStatus,
        deadline: new Date(validatedData.deadline || Date.now()),
    };
      const task = await taskUseCase.createTask(dataForDomain, userId);
      res.status(201).json(task);
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default apiMiddleware(authMiddleware(handler));