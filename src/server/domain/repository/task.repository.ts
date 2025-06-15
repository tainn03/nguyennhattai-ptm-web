import { Database } from "server/config/database";
import { Task } from "../entity/task.entity";

export class TaskRepository {
  private repository;

  constructor() {
    this.repository = Database.getInstance()
      .getDataSource()
      .then((dataSource) => dataSource.getRepository(Task));
  }
  
  async findAll(): Promise<Task[]> {
    const repo = await this.repository;
    return repo.find();
  }

  async findById(id: string): Promise<Task | null> {
    const repo = await this.repository;
    return repo.findOneBy({ id });
  }

  async create(task: Partial<Task>): Promise<Task> {
    const repo = await this.repository;
    const newTask = repo.create(task);
    return repo.save(newTask);
  }

  async update(id: string, task: Partial<Task>): Promise<Task | null> {
    const repo = await this.repository;
    await repo.update(id, task);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const repo = await this.repository;
    await repo.delete(id);
  }
}