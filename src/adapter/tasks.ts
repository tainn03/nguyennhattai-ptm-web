import axios from 'axios';
import { Task } from 'server/domain/entity/task.entity';

const API_BASE_URL = '/api/tasks';

const getAxiosInstance = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

export const taskApi = {
  getTasks: async (): Promise<Task[]> => {
    const { data } = await getAxiosInstance().get('');
    return data;
  },
  getTaskById: async (id: string): Promise<Task> => {
    const { data } = await getAxiosInstance().get(`/${id}`);
    return data;
  },
  createTask: async (task: Partial<Task>): Promise<Task> => {
    const { data } = await getAxiosInstance().post('', task);
    return data;
  },
  updateTask: async (id: string, task: Partial<Task>): Promise<Task> => {
    const { data } = await getAxiosInstance().put(`/${id}`, task);
    return data;
  },
  deleteTask: async (id: string): Promise<void> => {
    await getAxiosInstance().delete(`/${id}`);
  }
};