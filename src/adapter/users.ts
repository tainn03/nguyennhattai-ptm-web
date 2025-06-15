import axios from 'axios';
import { User } from 'server/domain/entity/user.entity';

const API_BASE_URL = '/api/users';

const getAxiosInstance = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

export const userAdapter = {
  register: async (user: { email: string; name: string; password: string }): Promise<User> => {
    const { data } = await getAxiosInstance().post('/', user);
    return data;
  },

  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const { data } = await getAxiosInstance().post('/login', { email, password });
    localStorage.setItem('token', data.token);
    return data;
  },

  getProfile: async (): Promise<User> => {
    const { data } = await getAxiosInstance().get('/profile');
    return data;
  },

  updateProfile: async (user: Partial<User>): Promise<User> => {
    const { data } = await getAxiosInstance().put('/profile', user);
    return data;
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('token');
  },
};