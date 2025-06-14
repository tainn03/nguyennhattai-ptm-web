import express from 'express';
import next from 'next';
import { AppDataSource } from './config/database';
import taskController from './controller/task.controller';
import { authMiddleware } from './middleware/auth.middleware';
import userController from './controller/user.controller';
import morgan from 'morgan';
import logger from './config/logger';
import { errorMiddleware } from './middleware/error.middleware';

server.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

server.use(errorMiddleware);

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

(async () => {
  try {
    // Initialize Next.js
    await app.prepare();

    // Initialize TypeORM
    await AppDataSource.initialize();
    console.log('Database connected');

    // Create Express server
    const server = express();
    server.use(express.json());

    // Mount user routes
    server.use('/api/users', userController);
    server.use('/api/tasks', authMiddleware, taskController);

    // Handle Next.js routes
    server.all('*', (req, res) => handle(req, res));

    // Start server
    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
})();