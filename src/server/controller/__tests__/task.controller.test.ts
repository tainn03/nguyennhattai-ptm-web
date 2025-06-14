import express from 'express';
import request from 'supertest';
import taskController from '../task.controller';
import { AppDataSource } from '../../config/database';
import { Task } from '../../domain/task/task.entity';
import { faker } from '@faker-js/faker';

describe('TaskController', () => {
  let app: express.Application;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/tasks', taskController);
    await AppDataSource.getRepository(Task).clear(); // Clear database before each test
  });

  it('POST /api/tasks should create a task', async () => {
    const taskData = {
      title: faker.lorem.words(3),
      desc: faker.lorem.sentence(),
      status: 'todo',
      deadline: new Date().toISOString(),
    };

    const response = await request(app).post('/api/tasks').send(taskData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(taskData.title);
  });

  it('GET /api/tasks should return all tasks', async () => {
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

    await AppDataSource.getRepository(Task).save(taskData);
    const response = await request(app).get('/api/tasks');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe(taskData.title);
  });

  it('PUT /api/tasks/:id should update a task', async () => {
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

    const task = await AppDataSource.getRepository(Task).save(taskData);
    const updatedData = { title: 'Updated Title' };

    const response = await request(app).put(`/api/tasks/${task.id}`).send(updatedData);

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated Title');
  });

  it('DELETE /api/tasks/:id should delete a task', async () => {
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

    const task = await AppDataSource.getRepository(Task).save(taskData);
    const response = await request(app).delete(`/api/tasks/${task.id}`);

    expect(response.status).toBe(204);
    const deletedTask = await AppDataSource.getRepository(Task).findOneBy({ id: task.id });
    expect(deletedTask).toBeNull();
  });

  it('POST /api/tasks should return 400 for invalid data', async () => {
    const invalidData = { title: '', desc: '' }; // Invalid: empty title and desc
    const response = await request(app).post('/api/tasks').send(invalidData);

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});