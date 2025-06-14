import { TaskUseCase } from '../task.usecase';
import { TaskRepository } from '../../repository/task.repository';
import { Task } from '../../domain/task/task.entity';
import { AppDataSource } from '../../config/database';
import { faker } from '@faker-js/faker';

describe('TaskUseCase', () => {
  let taskUseCase: TaskUseCase;
  let taskRepository: TaskRepository;

  beforeEach(async () => {
    taskRepository = new TaskRepository();
    taskUseCase = new TaskUseCase(taskRepository);
    await AppDataSource.getRepository(Task).clear(); // Clear database before each test
  });

  it('should create a new task', async () => {
    const taskData: Partial<Task> = {
      title: faker.lorem.words(3),
      desc: faker.lorem.sentence(),
      status: 'todo',
      deadline: new Date(),
    };
    const userId = faker.string.uuid();

    const createdTask = await taskUseCase.createTask(taskData, userId);

    expect(createdTask).toHaveProperty('id');
    expect(createdTask.title).toBe(taskData.title);
    expect(createdTask.createdBy).toBe(userId);
    expect(createdTask.updatedAt).toBeInstanceOf(Date);
  });

  it('should retrieve all tasks', async () => {
    const taskData: Partial<Task> = {
      title: faker.lorem.words(3),
      desc: faker.lorem.sentence(),
      status: 'todo',
      deadline: new Date(),
      createdAt: new Date(),
      createdBy: faker.string.uuid(),
      updatedAt: new Date(),
      updatedBy: faker.string.uuid(),
    };

    await taskRepository.create(taskData);
    const tasks = await taskUseCase.getAllTasks();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe(taskData.title);
  });

  it('should update a task', async () => {
    const taskData: Partial<Task> = {
      title: faker.lorem.words(3),
      desc: faker.lorem.sentence(),
      status: 'todo',
      deadline: new Date(),
      createdAt: new Date(),
      createdBy: faker.string.uuid(),
      updatedAt: new Date(),
      updatedBy: faker.string.uuid(),
    };

    const createdTask = await taskRepository.create(taskData);
    const updatedData: Partial<Task> = { title: 'Updated Title' };
    const userId = faker.string.uuid();

    const updatedTask = await taskUseCase.updateTask(createdTask.id, updatedData, userId);

    expect(updatedTask).toBeDefined();
    expect(updatedTask!.title).toBe('Updated Title');
    expect(updatedTask!.updatedBy).toBe(userId);
  });

  it('should delete a task', async () => {
    const taskData: Partial<Task> = {
      title: faker.lorem.words(3),
      desc: faker.lorem.sentence(),
      status: 'todo',
      deadline: new Date(),
      createdAt: new Date(),
      createdBy: faker.string.uuid(),
      updatedAt: new Date(),
      updatedBy: faker.string.uuid(),
    };

    const createdTask = await taskRepository.create(taskData);
    await taskUseCase.deleteTask(createdTask.id);
    const task = await taskRepository.findById(createdTask.id);

    expect(task).toBeNull();
  });
});