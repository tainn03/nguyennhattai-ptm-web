import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TaskUseCase } from '../application/task.usecase';
import { TaskRepository } from '../repository/task.repository';
import logger from '../config/logger';

const router = Router();
const taskUseCase = new TaskUseCase(new TaskRepository());

// Zod schema for task validation
const createTaskSchema = z.object({
  title: z.string().min(1),
  desc: z.string().min(1),
  status: z.enum(['todo', 'in_progress', 'done']),
  deadline: z.string().datetime(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  desc: z.string().min(1).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  deadline: z.string().datetime().optional(),
});

// Get all tasks
router.get('/', async (req: Request, res: Response) => {
  const tasks = await taskUseCase.getAllTasks();
  res.json(tasks);
});

// Get task by ID
router.get('/:id', async (req: Request, res: Response) => {
  const task = await taskUseCase.getTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// Create task
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createTaskSchema.parse(req.body);
    logger.info(`Creating task with title: ${validatedData.title}`);
    const task = await taskUseCase.createTask(validatedData, 'user-id-placeholder');
    res.status(201).json(task);
  } catch (error) {
    logger.error(`Error creating task: ${(error as Error).message}`);
    res.status(400).json({ error: (error as Error).message });
  }
});

// Update task
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const validatedData = updateTaskSchema.parse(req.body);
    // Convert deadline from string to Date if present
    const dataWithDate = validatedData.deadline
      ? { ...validatedData, deadline: new Date(validatedData.deadline) }
      : validatedData;
    const task = await taskUseCase.updateTask(req.params.id, dataWithDate, 'user-id-placeholder');
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Delete task
router.delete('/:id', async (req: Request, res: Response) => {
  await taskUseCase.deleteTask(req.params.id);
  res.status(204).send();
});

export default router;