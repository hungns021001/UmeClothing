import { cleanParams, http, unwrap } from './client';
import type { ProductVariant, ProductVariantRequest, VariantAvailability } from '../types';

/** Lịch/size luôn quản lý qua variant, không qua Product. */
export const productVariantsApi = {
  list: (productId: number) => unwrap<ProductVariant[]>(http.get(`/api/products/${productId}/variants`)),
  /** Không truyền ngày: chỉ lấy blockedRanges. Truyền cả hai: kèm isAvailable + conflicts. */
  availability: (productId: number, variantId: number, startDate?: string, endDate?: string) =>
    unwrap<VariantAvailability>(
      http.get(`/api/products/${productId}/variants/${variantId}/availability`, { params: cleanParams({ startDate, endDate }) }),
    ),

  // Admin/Staff
  create: (productId: number, payload: ProductVariantRequest) =>
    unwrap<ProductVariant>(http.post(`/api/products/${productId}/variants`, payload)),
  update: (productId: number, variantId: number, payload: ProductVariantRequest) =>
    unwrap<ProductVariant>(http.put(`/api/products/${productId}/variants/${variantId}`, payload)),
  remove: (productId: number, variantId: number) => unwrap<null>(http.delete(`/api/products/${productId}/variants/${variantId}`)),
};
