import { TaskRepository } from '../repository/task.repository';
import { Task } from '../domain/task/task.entity';
import { NotFoundError } from '../utils/errors';

export class TaskUseCase {
  constructor(private taskRepository: TaskRepository) {}

  async getAllTasks(): Promise<Task[]> {
    return this.taskRepository.findAll();
  }

  async getTaskById(id: string): Promise<Task | null> {
    return this.taskRepository.findById(id);
  }

  async createTask(task: Partial<Task>, userId: string): Promise<Task> {
    const newTask = {
      ...task,
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      updatedBy: userId,
    };
    return this.taskRepository.create(newTask);
  }

  async updateTask(id: string, task: Partial<Task>, userId: string): Promise<Task | null> {
    const existingTask = await this.taskRepository.findById(id);
    if (!existingTask) throw new NotFoundError('Task');
    const updatedTask = { ...task, updatedAt: new Date(), updatedBy: userId };
    return this.taskRepository.update(id, updatedTask);
  }

  async deleteTask(id: string): Promise<void> {
    return this.taskRepository.delete(id);
  }
}