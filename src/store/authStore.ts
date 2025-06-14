import create from 'zustand';

     interface AuthState {
       token: string | null;
       user: { id: string; email: string; role: string } | null;
       setAuth: (token: string, user: { id: string; email: string; role: string }) => void;
       clearAuth: () => void;
     }

     export const useAuthStore = create<AuthState>((set) => ({
       token: null,
       user: null,
       setAuth: (token, user) => set({ token, user }),
       clearAuth: () => set({ token: null, user: null }),
     }));