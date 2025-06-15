import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loginSchema, registerSchema, updateProfileSchema } from 'server/controller/validator/users.validation';
import { User, UserRole } from 'server/domain/entity/user.entity';
import { UserRepository } from 'server/domain/repository/user.repository';
import { AuthenticationError, DatabaseError, NotFoundError, ValidationError } from 'server/utils/error';

export class UserUseCase {
  constructor(private userRepository: UserRepository) {}

  async register(userData: Partial<User>): Promise<User> {
    try {
      const validatedData = registerSchema.parse(userData);
      const existingUser = await this.userRepository.findByEmail(validatedData.email);
      if (existingUser) {
        throw new ValidationError({ message: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const newUser = {
        ...validatedData,
        password: hashedPassword,
        role: "user" as UserRole,
      };

      return await this.userRepository.create(newUser);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new DatabaseError('Failed to register user');
    }
  }

  async login(email: string, password: string): Promise<{ token: string; user: User; refreshToken: string }> {
    try {
      const validatedData = loginSchema.parse({ email, password });
      const user = await this.userRepository.findByEmail(validatedData.email);
      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '1h' },
      );
      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.REFRESH_SECRET || 'your_refresh_secret',
        { expiresIn: '7d' }
      );

      return { token, user, refreshToken };
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof ValidationError) throw error;
      throw new DatabaseError('Failed to login');
    }
  }

  async getProfile(userId: string): Promise<User> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to retrieve profile');
    }
  }

  async updateProfile(userId: string, userData: Partial<User>): Promise<User> {
    try {
      const validatedData = updateProfileSchema.parse(userData);
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      if (validatedData.email && validatedData.email !== user.email) {
        const existingUser = await this.userRepository.findByEmail(validatedData.email);
        if (existingUser) {
          throw new ValidationError({ message: 'Email already exists' });
        }
      }

      const updatedUser = await this.userRepository.update(userId, validatedData);
      if(!updatedUser) {
        throw new NotFoundError('User');
      }
      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
      throw new DatabaseError('Failed to update profile');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async logout(token: string): Promise<void> {
    // Assuming a Redis client is available
    // Add token to Redis blacklist with TTL
  }

}