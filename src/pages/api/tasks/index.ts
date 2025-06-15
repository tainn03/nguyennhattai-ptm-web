import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import logger from '../../../server/config/logger';
import { TaskApplication } from 'server/application/task.application';
import { TaskRepository } from 'server/domain/repository/task.repository';
import { createTaskSchema } from 'server/controller/validator/task.validation';
import { NotFoundError } from 'server/utils/error';
import { TaskStatus } from 'server/domain/entity/task.entity';

const taskUseCase = new TaskApplication(new TaskRepository());

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const tasks = await taskUseCase.getAllTasks();
        logger.info('Fetched all tasks');
        res.status(200).json(tasks);
        break;

      case 'POST':
        const validatedData = createTaskSchema.parse(req.body);
        logger.info(`Creating task with title: ${validatedData.title}`);
        // Convert status to TaskStatus and deadline to Date
        const dataForDomain = {
        ...validatedData,
        status: validatedData.status as unknown as TaskStatus,
        deadline: new Date(validatedData.deadline),
        };
        const task = await taskUseCase.createTask(dataForDomain, 'user-id-placeholder'); // Replace with auth
        res.status(201).json(task);
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    // logger.error(`Error: ${(error as Error).message}`);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}