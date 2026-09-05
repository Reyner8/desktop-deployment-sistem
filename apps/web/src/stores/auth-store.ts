import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: { username: string; displayName: string } | null;
  setAuth: (token: string, user: { username: string; displayName: string }) => void;
  logout: () => void;
}

const storedToken = localStorage.getItem('auth-token');
const storedUser = localStorage.getItem('auth-user');

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,
  setAuth: (token, user) => {
    localStorage.setItem('auth-token', token);
    localStorage.setItem('auth-user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
    set({ token: null, user: null });
  },
}));