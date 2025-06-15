import { Database } from 'server/config/database';
import { TaskRepository } from '../task.repository';
import { Task, TaskStatus } from 'server/domain/entity/task.entity';
import { DataSource } from 'typeorm';

describe('TaskRepository', () => {
  let taskRepository: TaskRepository;
  let dataSource: DataSource;

  beforeEach(async () => {
    taskRepository = new TaskRepository();
    dataSource = await Database.getInstance().getDataSource();
    await dataSource.getRepository(Task).clear(); // Clear database before each test
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  describe('findAll', () => {
    it('should return an empty array when no tasks exist', async () => {
      const tasks = await taskRepository.findAll();
      expect(tasks).toEqual([]);
    });

    it('should return all tasks when tasks exist', async () => {
      const taskData: Partial<Task> = {
        title: `Test Task ${Date.now()}`,
        desc: `Test Description ${Date.now()}`,
        status: TaskStatus.TODO,
        deadline: new Date(),
        createdAt: new Date(),
        createdBy: `user-${Date.now()}`,
        updatedAt: new Date(),
        updatedBy: `user-${Date.now()}`,
      };

      await dataSource.getRepository(Task).save(taskData);
      const tasks = await taskRepository.findAll();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe(taskData.title);
      expect(tasks[0].desc).toBe(taskData.desc);
      expect(tasks[0].status).toBe(taskData.status);
    });
  });

  describe('findById', () => {
    it('should return a task by ID', async () => {
      const taskData: Partial<Task> = {
        title: `Test Task ${Date.now()}`,
        desc: `Test Description ${Date.now()}`,
        status: TaskStatus.IN_PROGRESS,
        deadline: new Date(),
        createdAt: new Date(),
        createdBy: `user-${Date.now()}`,
        updatedAt: new Date(),
        updatedBy: `user-${Date.now()}`,
      };

      const savedTask = await dataSource.getRepository(Task).save(taskData);
      const task = await taskRepository.findById(savedTask.id);

      expect(task).toBeDefined();
      expect(task!.id).toBe(savedTask.id);
      expect(task!.title).toBe(taskData.title);
    });

    it('should return null for non-existent task ID', async () => {
      const task = await taskRepository.findById(`non-existent-id`);
      expect(task).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new task with valid data', async () => {
      const taskData: Partial<Task> = {
        title: `Test Task ${Date.now()}`,
        desc: `Test Description ${Date.now()}`,
        status: TaskStatus.TODO,
        deadline: new Date(),
        createdAt: new Date(),
        createdBy: `user-${Date.now()}`,
        updatedAt: new Date(),
        updatedBy: `user-${Date.now()}`,
      };

      const createdTask = await taskRepository.create(taskData);

      expect(createdTask).toHaveProperty('id');
      expect(createdTask.title).toBe(taskData.title);
      expect(createdTask.desc).toBe(taskData.desc);
      expect(createdTask.status).toBe(taskData.status);
      expect(createdTask.createdBy).toBe(taskData.createdBy);
    });

    it('should throw an error for invalid status', async () => {
      const taskData: Partial<Task> = {
        title: `Test Task ${Date.now()}`,
        desc: `Test Description ${Date.now()}`,
        status: 'invalid_status' as unknown as TaskStatus, // Invalid status
        deadline: new Date(),
        createdAt: new Date(),
        createdBy: `user-${Date.now()}`,
        updatedAt: new Date(),
        updatedBy: `user-${Date.now()}`,
      };

      await expect(taskRepository.create(taskData)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update an existing task', async () => {
      const taskData: Partial<Task> = {
        title: `Test Task ${Date.now()}`,
        desc: `Test Description ${Date.now()}`,
        status: TaskStatus.TODO,
        deadline: new Date(),
        createdAt: new Date(),
        createdBy: `user-${Date.now()}`,
        updatedAt: new Date(),
        updatedBy: `user-${Date.now()}`,
      };

      const savedTask = await dataSource.getRepository(Task).save(taskData);
      const updatedData: Partial<Task> = {
        title: 'Updated Title',
        status: TaskStatus.DONE,
      };

      const updatedTask = await taskRepository.update(savedTask.id, updatedData);

      expect(updatedTask).toBeDefined();
      expect(updatedTask!.title).toBe('Updated Title');
      expect(updatedTask!.status).toBe('done');
    });

    it('should return null for non-existent task ID', async () => {
      const updatedData: Partial<Task> = { title: 'Updated Title' };
      const task = await taskRepository.update(`non-existent-id`, updatedData);
      expect(task).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an existing task', async () => {
      const taskData: Partial<Task> = {
        title: `Test Task ${Date.now()}`,
        desc: `Test Description ${Date.now()}`,
        status: TaskStatus.TODO,
        deadline: new Date(),
        createdAt: new Date(),
        createdBy: `user-${Date.now()}`,
        updatedAt: new Date(),
        updatedBy: `user-${Date.now()}`,
      };

      const savedTask = await dataSource.getRepository(Task).save(taskData);
      await taskRepository.delete(savedTask.id);

      const task = await taskRepository.findById(savedTask.id);
      expect(task).toBeNull();
    });

    it('should not throw an error for non-existent task ID', async () => {
      await expect(taskRepository.delete(`non-existent-id`)).resolves.toBeUndefined();
    });
  });
});