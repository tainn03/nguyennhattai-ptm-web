import { DataSource } from 'typeorm';
import { Task } from '../domain/task/task.entity';
import { User } from '../domain/user/user.entity';
import 'dotenv/config';

export const AppDataSource = new DataSource({
  type: process.env.DB_TYPE as 'mysql' | 'sqlite',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Task, User],
  synchronize: process.env.NODE_ENV !== 'production',
});