import { API_URL } from '../api/client';

/** Backend (LocalImageStorage) trả đường dẫn tương đối "/uploads/..."; Cloudinary/R2 trả URL tuyệt đối. */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
