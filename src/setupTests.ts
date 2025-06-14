import { AppDataSource } from './server/config/database';
import { DataSource } from 'typeorm';

beforeAll(async () => {
  // Override AppDataSource for tests
  AppDataSource.setOptions({
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    dropSchema: true,
    entities: ['src/server/domain/**/*.entity.ts'],
  });
  await AppDataSource.initialize();
});

afterAll(async () => {
  await AppDataSource.destroy();
});