import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { apiMiddleware } from '../../../server/middleware/api.middleware';
import { TaskApplication } from 'server/application/task.application';
import { TaskRepository } from 'server/domain/repository/task.repository';
import { TaskStatus } from 'server/domain/entity/task.entity'; // Add this import
import { authMiddleware } from 'server/middleware/auth.middleware';

const taskUseCase = new TaskApplication(new TaskRepository());

const createTaskSchema = z.object({
  title: z.string().min(1),
  desc: z.string().min(1),
  status: z.enum(['todo', 'in_progress', 'done']),
  deadline: z.string().datetime(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      const task = await taskUseCase.createTask(dataForDomain, 'user-id-placeholder'); // Replace with auth
      res.status(201).json(task);
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default apiMiddleware(authMiddleware(handler));