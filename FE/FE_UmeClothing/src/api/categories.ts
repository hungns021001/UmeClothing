import { http, unwrap } from './client';
import type { Category, CategoryRequest } from '../types';

export const categoriesApi = {
  list: () => unwrap<Category[]>(http.get('/api/categories')),
  getBySlug: (slug: string) => unwrap<Category>(http.get(`/api/categories/slug/${encodeURIComponent(slug)}`)),

  // Admin/Staff
  create: (payload: CategoryRequest) => unwrap<Category>(http.post('/api/categories', payload)),
  update: (id: number, payload: CategoryRequest) => unwrap<Category>(http.put(`/api/categories/${id}`, payload)),
  remove: (id: number) => unwrap<null>(http.delete(`/api/categories/${id}`)),
};
