import axios from 'axios';
import { Task } from './server/domain/task/task.entity';

const API_BASE_URL = '/api/tasks';
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export const taskAdapter = {
  getTasks: async (): Promise<Task[]> => {
    const { data } = await axiosInstance.get('/');
    return data;
  },

  getTaskById: async (id: string): Promise<Task> => {
    const { data } = await axiosInstance.get(`/${id}`);
    return data;
  },

  createTask: async (task: Partial<Task>): Promise<Task> => {
    const { data } = await axiosInstance.post('/', task);
    return data;
  },

  updateTask: async (id: string, task: Partial<Task>): Promise<Task> => {
    const { data } = await axiosInstance.put(`/${id}`, task);
    return data;
  },

  deleteTask: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/${id}`);
  },
};