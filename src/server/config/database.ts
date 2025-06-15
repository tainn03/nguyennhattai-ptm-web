import { DataSource } from 'typeorm';
import 'dotenv/config';
import { Task } from 'server/domain/entity/task.entity';
import { User } from 'server/domain/entity/user.entity';

export class Database {
  private static instance: Database;
  private dataSource: DataSource;

  private constructor() {
    this.dataSource = new DataSource({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'tms',
      entities: [Task, User],
      synchronize: true,
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async getDataSource(): Promise<DataSource> {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
    return this.dataSource;
  }
}