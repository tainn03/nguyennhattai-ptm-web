import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { apiMiddleware } from '../../../server/middleware/api.middleware';
import { TaskApplication } from 'server/application/task.application';
import { TaskRepository } from 'server/domain/repository/task.repository';
import { TaskStatus } from 'server/domain/entity/task.entity';

const taskUseCase = new TaskApplication(new TaskRepository());

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  desc: z.string().min(1).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  deadline: z.string().datetime().optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    throw new Error('Invalid task ID');
  }

  switch (req.method) {
    case 'GET':
      const task = await taskUseCase.getTaskById(id);
      if (!task) throw new Error('Task not found');
      res.status(200).json(task);
      break;

    case 'PUT':
      const validatedData = updateTaskSchema.parse(req.body);
      const dataForDomain = {
        ...validatedData,
        status: validatedData.status as unknown as TaskStatus,
        deadline: new Date(validatedData.deadline || Date.now()),
    };
      const updatedTask = await taskUseCase.updateTask(id, dataForDomain, 'user-id-placeholder');
      if (!updatedTask) throw new Error('Task not found');
      res.status(200).json(updatedTask);
      break;

    case 'DELETE':
      await taskUseCase.deleteTask(id);
      res.status(204).end();
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default apiMiddleware(handler);