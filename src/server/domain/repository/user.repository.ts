import { Database } from "server/config/database";
import { User } from "../entity/user.entity";


export class UserRepository {
  private repository;

  constructor() {
    this.repository = Database.getInstance()
      .getDataSource()
      .then((dataSource) => dataSource.getRepository(User));
  }

  async findById(id: string): Promise<User | null> {
    const repo = await this.repository;
    return repo.findOneBy({ id });
  }

  async findByEmail(email: string): Promise<User | null> {
    const repo = await this.repository;
    return repo.findOneBy({ email });
  }

  async create(user: Partial<User>): Promise<User> {
    const repo = await this.repository;
    const newUser = repo.create(user);
    return repo.save(newUser);
  }

  async update(id: string, user: Partial<User>): Promise<User | null> {
    const repo = await this.repository;
    await repo.update(id, user);
    return this.findById(id);
  }
}