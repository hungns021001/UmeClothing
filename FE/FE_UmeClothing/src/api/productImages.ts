import { http, unwrap } from './client';
import type { ProductImage } from '../types';

/** Mọi thao tác trả về danh sách ảnh đã cập nhật của sản phẩm. */
export const productImagesApi = {
  upload: (productId: number, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    // Không tự set Content-Type: trình duyệt cần tự thêm boundary cho multipart.
    return unwrap<ProductImage[]>(http.post(`/api/products/${productId}/images`, form, { timeout: 120_000 }));
  },
  remove: (productId: number, imageId: number) => unwrap<ProductImage[]>(http.delete(`/api/products/${productId}/images/${imageId}`)),
  setPrimary: (productId: number, imageId: number) =>
    unwrap<ProductImage[]>(http.put(`/api/products/${productId}/images/${imageId}/primary`)),
  reorder: (productId: number, imageIds: number[]) =>
    unwrap<ProductImage[]>(http.put(`/api/products/${productId}/images/order`, { imageIds })),
};
