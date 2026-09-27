import { cleanParams, http, unwrap } from './client';
import type { PagedResult, Product, ProductQuery, ProductRequest } from '../types';

export const productsApi = {
  list: (query: ProductQuery) => unwrap<PagedResult<Product>>(http.get('/api/products', { params: cleanParams(query) })),
  getById: (id: number) => unwrap<Product>(http.get(`/api/products/${id}`)),
  getBySlug: (slug: string) => unwrap<Product>(http.get(`/api/products/slug/${encodeURIComponent(slug)}`)),

  // Admin/Staff
  create: (payload: ProductRequest) => unwrap<Product>(http.post('/api/products', payload)),
  update: (id: number, payload: ProductRequest) => unwrap<Product>(http.put(`/api/products/${id}`, payload)),
  remove: (id: number) => unwrap<null>(http.delete(`/api/products/${id}`)),
};
