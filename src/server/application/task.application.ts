import { Task } from "../domain/entity/task.entity";
import { TaskRepository } from "../domain/repository/task.repository";
import { NotFoundError } from "../utils/error";


export class TaskApplication {
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
        const existingTask = await this.taskRepository.findById(id);
        if (!existingTask) throw new NotFoundError('Task');
        return this.taskRepository.delete(id);
    }
}