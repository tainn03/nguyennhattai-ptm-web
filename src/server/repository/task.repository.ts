import { AppDataSource } from '../config/database';
import { Task } from '../domain/task/task.entity';

export class TaskRepository {
  private repository = AppDataSource.getRepository(Task);

  async findAll(): Promise<Task[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<Task | null> {
    return this.repository.findOneBy({ id });
  }

  async create(task: Partial<Task>): Promise<Task> {
    const newTask = this.repository.create(task);
    return this.repository.save(newTask);
  }

  async update(id: string, task: Partial<Task>): Promise<Task | null> {
    await this.repository.update(id, task);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}