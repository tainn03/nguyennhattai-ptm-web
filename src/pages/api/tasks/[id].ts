import { NextApiResponse } from "next";
import { TaskApplication } from "server/application/task.application";
import { updateTaskSchema } from "server/controller/validator/task.validation";
import { TaskStatus } from "server/domain/entity/task.entity";
import { TaskRepository } from "server/domain/repository/task.repository";
import { apiMiddleware } from "server/middleware/api.middleware";
import { AuthenticatedRequest, authMiddleware } from "server/middleware/auth.middleware";
import { ValidationError, NotFoundError } from "server/utils/error";


const taskUseCase = new TaskApplication(new TaskRepository());


async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  const userId = req.user!.id;

  if (typeof id !== 'string') {
    throw new ValidationError({ message: 'Invalid task ID' });
  }

  switch (req.method) {
    case 'GET':
      const task = await taskUseCase.getTaskById(id);
      if (!task) throw new NotFoundError('Task');
      res.status(200).json(task);
      break;

    case 'PUT':
      const validatedData = updateTaskSchema.parse(req.body);
      const dataForDomain = {
              ...validatedData,
              status: validatedData.status as unknown as TaskStatus,
              deadline: new Date(validatedData.deadline || Date.now()),
          };
      const updatedTask = await taskUseCase.updateTask(id, dataForDomain, userId);
      if (!updatedTask) throw new NotFoundError('Task');
      res.status(200).json(updatedTask);
      break;

    case 'DELETE':
      await taskUseCase.deleteTask(id);
      res.status(204).end();
      break;

    default:
      throw new ValidationError({ message: `Method ${req.method} not allowed`, allowed: ['GET', 'PUT', 'DELETE'] });
  }
}

export default apiMiddleware(authMiddleware(handler));