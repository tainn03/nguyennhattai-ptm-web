import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import logger from '../../../server/config/logger';
import { TaskApplication } from 'server/application/task.application';
import { TaskRepository } from 'server/domain/repository/task.repository';
import { NotFoundError } from 'server/utils/error';
import { updateTaskSchema } from 'server/controller/validator/task.validation';
import { TaskStatus } from 'server/domain/entity/task.entity';

const taskUseCase = new TaskApplication(new TaskRepository());

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        const task = await taskUseCase.getTaskById(id);
        if (!task) throw new NotFoundError('Task');
        logger.info(`Fetched task with ID: ${id}`);
        res.status(200).json(task);
        break;

      case 'PUT':
        const validatedData = updateTaskSchema.parse(req.body);
        logger.info(`Updating task with ID: ${id}`);
        const dataForDomain = {
            ...validatedData,
            status: validatedData.status as unknown as TaskStatus,
            deadline: new Date(validatedData.deadline || Date.now()),
        };
        const updatedTask = await taskUseCase.updateTask(id, dataForDomain, 'user-id-placeholder');
        if (!updatedTask) throw new NotFoundError('Task');
        res.status(200).json(updatedTask);
        break;

      case 'DELETE':
        logger.info(`Deleting task with ID: ${id}`);
        await taskUseCase.deleteTask(id);
        res.status(204).end();
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    logger.error(`Error: ${(error as Error).message}`);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}