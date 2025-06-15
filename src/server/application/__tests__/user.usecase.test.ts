
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserUseCase } from '../user.application';
import { UserRepository } from 'server/domain/repository/user.repository';
import { Database } from 'server/config/database';
import { User } from 'server/domain/entity/user.entity';
import { ValidationError, AuthenticationError, NotFoundError } from 'server/utils/error';

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mocked-token'),
}));

describe('UserUseCase', () => {
  let userUseCase: UserUseCase;
  let userRepository: UserRepository;

  beforeEach(async () => {
    userRepository = new UserRepository();
    userUseCase = new UserUseCase(userRepository);
    const dataSource = await Database.getInstance().getDataSource();
    await dataSource.getRepository(User).clear();
  });

  afterAll(async () => {
    const dataSource = await Database.getInstance().getDataSource();
    await dataSource.destroy();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: `${Date.now()}@example.com`, // Ensure unique email
        name: `${Date.now()} User`,
        password: 'password123',
      };

      const user = await userUseCase.register(userData);

      expect(user).toHaveProperty('id');
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(await bcrypt.compare(userData.password, user.password)).toBe(true);
    });

    it('should throw ValidationError for duplicate email', async () => {
      const userData = {
        email: `${Date.now()}@example.com`, // Ensure unique email
        name: `${Date.now()} User`,
        password: 'password123',
      };

      await userUseCase.register(userData);
      await expect(userUseCase.register(userData)).rejects.toThrow(ValidationError);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const userData = {
        email: `${Date.now()}@example.com`, // Ensure unique email
        name: `${Date.now()} User`,
        password: 'password123',
      };

      await userUseCase.register(userData);
      const result = await userUseCase.login(userData.email, userData.password);

      expect(result).toEqual({
        token: 'mocked-token',
        user: expect.objectContaining({ email: userData.email, name: userData.name }),
      });
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('should throw AuthenticationError for invalid credentials', async () => {
      await expect(userUseCase.login(`${Date.now()}@example.com`, 'wrong')).rejects.toThrow(AuthenticationError);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const userData = {
        email: `${Date.now()}@example.com`,
        name: `${Date.now()} User`,
        password: 'password123',
      };

      const createdUser = await userUseCase.register(userData);
      const user = await userUseCase.getProfile(createdUser.id);

      expect(user).toMatchObject({
        id: createdUser.id,
        email: userData.email,
        name: userData.name,
      });
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(userUseCase.getProfile(`non-existent-id`)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userData = {
        email: `${Date.now()}@example.com`,
        name: `${Date.now()} User`,
        password: 'password123',
      };

      const createdUser = await userUseCase.register(userData);
      const updatedData = { name: 'Updated Name', email: `${Date.now()}@example.com` };
      const updatedUser = await userUseCase.updateProfile(createdUser.id, updatedData);

      expect(updatedUser).toMatchObject({
        id: createdUser.id,
        name: updatedData.name,
        email: updatedData.email,
      });
    });

    it('should throw ValidationError for duplicate email', async () => {
      const userData1 = {
        email: `${Date.now()}@example.com`,
        name: `${Date.now()} User`,
        password: 'password123',
      };
      const userData2 = {
        email: `${Date.now()}@example.com`,
        name: `${Date.now()} User`,
        password: 'password123',
      };

      const user1 = await userUseCase.register(userData1);
      await userUseCase.register(userData2);
      await expect(userUseCase.updateProfile(user1.id, { email: userData2.email })).rejects.toThrow(ValidationError);
    });
  });
});