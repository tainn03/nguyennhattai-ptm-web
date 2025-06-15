import axios from 'axios';
import { Task } from 'server/domain/entity/task.entity';

const API_BASE_URL = '/api/tasks';

export const taskAdapter = {
  getTasks: async (): Promise<Task[]> => {
    const { data } = await axios.get(API_BASE_URL);
    return data;
  },

  getTaskById: async (id: string): Promise<Task> => {
    const { data } = await axios.get(`${API_BASE_URL}/${id}`);
    return data;
  },

  createTask: async (task: Partial<Task>): Promise<Task> => {
    const { data } = await axios.post(API_BASE_URL, task);
    return data;
  },

  updateTask: async (id: string, task: Partial<Task>): Promise<Task> => {
    const { data } = await axios.put(`${API_BASE_URL}/${id}`, task);
    return data;
  },

  deleteTask: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/${id}`);
  },
};