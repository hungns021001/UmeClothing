import { http, unwrap } from './client';
import type { AuthResponse, User } from '../types';

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  phone?: string;
}

export const authApi = {
  register: (payload: RegisterPayload) => unwrap<AuthResponse>(http.post('/api/auth/register', payload)),
  login: (email: string, password: string) => unwrap<AuthResponse>(http.post('/api/auth/login', { email, password })),
  me: () => unwrap<User>(http.get('/api/auth/me')),
  updateProfile: (payload: UpdateProfilePayload) => unwrap<User>(http.put('/api/auth/profile', payload)),
  changePassword: (currentPassword: string, newPassword: string) =>
    unwrap<null>(http.put('/api/auth/password', { currentPassword, newPassword })),
  /** Thường không cần gọi trực tiếp: api/client.ts tự gọi khi gặp 401. Xuất ra để dùng lúc cần chủ động làm mới. */
  refresh: (refreshToken: string) => unwrap<AuthResponse>(http.post('/api/auth/refresh', { refreshToken })),
  logout: (refreshToken: string) => unwrap<null>(http.post('/api/auth/logout', { refreshToken })),
  /** Luôn thành công dù email có tồn tại hay không (backend cố tình không lộ thông tin này). */
  forgotPassword: (email: string) => unwrap<null>(http.post('/api/auth/forgot-password', { email })),
  resetPassword: (email: string, code: string, newPassword: string) =>
    unwrap<null>(http.post('/api/auth/reset-password', { email, code, newPassword })),
};
