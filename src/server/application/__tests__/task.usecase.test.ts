import { TaskRepository } from 'server/domain/repository/task.repository';
import { Database } from '../../config/database';
import { TaskApplication } from '../task.application';
import { Task, TaskStatus } from 'server/domain/entity/task.entity';
import { NotFoundError } from 'server/utils/error';

describe('TaskUseCase', () => {
  let taskUseCase: TaskApplication;
  let taskRepository: TaskRepository;

  beforeEach(async () => {
    taskRepository = new TaskRepository();
    taskUseCase = new TaskApplication(taskRepository);
    const dataSource = await Database.getInstance().getDataSource();
    await dataSource.getRepository(Task).clear(); // Clear database before each test
  });

  afterAll(async () => {
    const dataSource = await Database.getInstance().getDataSource();
    await dataSource.destroy();
  });

  describe('createTask', () => {
    it('should create a new task with valid data', async () => {
      const taskData: Partial<Task> = {
        title: `New Task ${Date.now()}`,
        desc: `Description for task ${Date.now()}`,
        status: TaskStatus.TODO,
        deadline: new Date(),
      };
      const userId = `user-${Date.now()}`;

      const createdTask = await taskUseCase.createTask(taskData, userId);

      expect(createdTask).toHaveProperty('id');
      expect(createdTask.title).toBe(taskData.title);
      expect(createdTask.desc).toBe(taskData.desc);
      expect(createdTask.status).toBe(taskData.status);
      expect(createdTask.createdBy).toBe(userId);
      expect(createdTask.updatedBy).toBe(userId);
      expect(createdTask.createdAt).toBeInstanceOf(Date);
      expect(createdTask.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw an error for missing required fields', async () => {
      const taskData: Partial<Task> = {
        desc: `Description for task ${Date.now()}`,
        status: TaskStatus.TODO,
        deadline: new Date(),
      };
      const userId = `user-${Date.now()}`;

      await expect(taskUseCase.createTask(taskData, userId)).rejects.toThrow();
    });
  });

  describe('getAllTasks', () => {
    it('should return an empty array when no tasks exist', async () => {
      const tasks = await taskUseCase.getAllTasks();
      expect(tasks).toEqual([]);
    });

    it('should return all tasks when tasks exist', async () => {
      const taskData: Partial<Task> = {
        title: `New Task ${Date.now()}`,
        desc: `Description for task ${Date.now()}`,
        status: TaskStatus.TODO,
        deadline: new Date(),
        createdAt: new Date(),
        createdBy: `user-${Date.now()}`,
        updatedAt: new Date(),
        updatedBy: `user-${Date.now()}`,
      };

      await taskRepository.create(taskData);
      const tasks = await taskUseCase.getAllTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe(taskData.title);
    });
  });

  describe('getTaskById', () => {
    it('should return a task by ID', async () => {
      const taskData: Partial<Task> = {
        title: `New Task ${Date.now()}`,
        desc: `Description for task ${Date.now()}`,
        status: TaskStatus.IN_PROGRESS,
        deadline: new Date(),
        createdAt: new Date(),
        createdBy: `user-${Date.now()}`,
        updatedAt: new Date(),
        updatedBy: `user-${Date.now()}`,
      };

      const createdTask = await taskRepository.create(taskData);
      const task = await taskUseCase.getTaskById(createdTask.id);

      expect(task).toBeDefined();
      expect(task!.id).toBe(createdTask.id);
      expect(task!.title).toBe(taskData.title);
    });

    it('should return null for non-existent task ID', async () => {
      const task = await taskUseCase.getTaskById('non-existent-id');
      expect(task).toBeNull();
    });
  });

  describe('updateTask', () => {
    it('should update a task with valid data', async () => {
      const userId = `user-${Date.now()}`;

      const taskData: Partial<Task> = {
        title: `New Task ${Date.now()}`,
        desc: `Description for task ${Date.now()}`,
        status: TaskStatus.TODO,
        deadline: new Date(),
        createdAt: new Date(),
        createdBy: userId,
        updatedAt: new Date(),
        updatedBy: userId,
      };

      const createdTask = await taskRepository.create(taskData);
      const updatedTitle = `Updated Task ${Date.now()}`;
      const updatedData: Partial<Task> = {
        title: updatedTitle,
        status: TaskStatus.DONE,
      };
      
      const updatedTask = await taskUseCase.updateTask(createdTask.id, updatedData, userId);

      expect(updatedTask).toBeDefined();
      expect(updatedTask!.title).toBe(updatedTitle);
      expect(updatedTask!.status).toBe(TaskStatus.DONE);
      expect(updatedTask!.updatedBy).toBe(userId);
      expect(updatedTask!.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundError for non-existent task', async () => {
      const updatedData: Partial<Task> = { title: `Updated Task ${Date.now()}` };
      const userId = `user-${Date.now()}`;

      await expect(taskUseCase.updateTask('non-existent-id', updatedData, userId))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task by ID', async () => {
      const taskData: Partial<Task> = {
        title: `New Task ${Date.now()}`,
        desc: `Description for task ${Date.now()}`,
        status: TaskStatus.TODO,
        deadline: new Date(),
        createdAt: new Date(),
        createdBy: `user-${Date.now()}`,
        updatedAt: new Date(),
        updatedBy: `user-${Date.now()}`,
      };

      const createdTask = await taskRepository.create(taskData);
      await taskUseCase.deleteTask(createdTask.id);

      const task = await taskRepository.findById(createdTask.id);
      expect(task).toBeNull();
    });

    it('should throw NotFoundError for non-existent task', async () => {
      await expect(taskUseCase.deleteTask('non-existent-id'))
        .rejects.toThrow(NotFoundError);
    });
  });
});