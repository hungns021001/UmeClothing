import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types';

export const API_URL: string = (import.meta.env.VITE_API_URL ?? 'https://localhost:7100').replace(/\/+$/, '');

const TOKEN_KEY = 'ume_token';
const REFRESH_KEY = 'ume_refresh_token';

/**
 * Token lưu ở localStorage: đơn giản nhưng đọc được bởi bất kỳ script nào chạy trên trang (rủi ro XSS).
 * Đổi sang cookie HttpOnly cần backend hỗ trợ. Access token sống ngắn (mặc định 15 phút ở backend);
 * refresh token sống dài hơn nhiều (mặc định 30 ngày) và được dùng để âm thầm lấy access token mới.
 */
function makeStore(key: string) {
  return {
    get(): string | null {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(value: string): void {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* bỏ qua: trình duyệt chặn storage */
      }
    },
    clear(): void {
      try {
        localStorage.removeItem(key);
      } catch {
        /* bỏ qua */
      }
    },
  };
}

export const tokenStore = makeStore(TOKEN_KEY);
export const refreshTokenStore = makeStore(REFRESH_KEY);

export const http = axios.create({ baseURL: API_URL, timeout: 20_000 });

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized: (() => void) | null = null;
let onTokenRefreshed: ((accessToken: string) => void) | null = null;

/** Gọi khi phiên đăng nhập không thể khôi phục (refresh thất bại hoặc không có refresh token). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

/** Gọi mỗi khi access token được âm thầm làm mới, để nơi khác (ví dụ kết nối SignalR) biết mà dùng token mới. */
export function setTokenRefreshedHandler(handler: ((accessToken: string) => void) | null): void {
  onTokenRefreshed = handler;
}

// Dùng instance axios riêng, KHÔNG đi qua interceptor của `http`, để gọi /auth/refresh không tự đệ quy vào chính nó.
const refreshClient = axios.create({ baseURL: API_URL, timeout: 20_000 });

let refreshingPromise: Promise<string | null> | null = null;

/** Đảm bảo chỉ có một request /auth/refresh bay đi tại một thời điểm, dù nhiều request 401 cùng lúc. */
async function ensureFreshAccessToken(): Promise<string | null> {
  refreshingPromise ??= performRefresh().finally(() => {
    refreshingPromise = null;
  });
  return refreshingPromise;
}

async function performRefresh(): Promise<string | null> {
  const refreshToken = refreshTokenStore.get();
  if (!refreshToken) return null;

  try {
    const response = await refreshClient.post<ApiResponse<{ token: string; refreshToken: string }>>('/api/auth/refresh', {
      refreshToken,
    });
    const data = response.data.data;
    tokenStore.set(data.token);
    refreshTokenStore.set(data.refreshToken);
    onTokenRefreshed?.(data.token);
    return data.token;
  } catch {
    return null;
  }
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const config = error.config as RetriableConfig | undefined;
    const hadAccessToken = tokenStore.get() !== null;

    // Chỉ thử refresh một lần cho mỗi request gốc, và chỉ khi trước đó có đăng nhập (401 lúc chưa đăng nhập
    // là do request tự nó cần auth, không phải phiên hết hạn).
    if (config && !config._retriedAfterRefresh && hadAccessToken && refreshTokenStore.get()) {
      config._retriedAfterRefresh = true;
      const newToken = await ensureFreshAccessToken();
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        return http(config);
      }
    }

    if (hadAccessToken) {
      tokenStore.clear();
      refreshTokenStore.clear();
      onUnauthorized?.();
    }

    return Promise.reject(error);
  },
);

/** Bóc `data` khỏi envelope ApiResponse. */
export async function unwrap<T>(request: Promise<AxiosResponse<ApiResponse<T>>>): Promise<T> {
  const response = await request;
  return response.data.data;
}

export interface ApiErrorInfo {
  status?: number;
  message: string;
  errors: string[];
}

export function parseApiError(err: unknown): ApiErrorInfo {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Partial<ApiResponse<unknown>> | undefined;
    if (data && typeof data.message === 'string' && data.message) {
      return {
        status: err.response?.status,
        message: data.message,
        errors: Array.isArray(data.errors) ? data.errors : [],
      };
    }
    if (err.code === 'ERR_NETWORK') {
      return {
        message:
          'Không kết nối được máy chủ. Hãy kiểm tra backend đang chạy và chứng chỉ HTTPS đã được tin cậy (dotnet dev-certs https --trust).',
        errors: [],
      };
    }
    if (err.code === 'ECONNABORTED') {
      return { message: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.', errors: [] };
    }
    return { status: err.response?.status, message: 'Đã xảy ra lỗi. Vui lòng thử lại.', errors: [] };
  }
  return { message: err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.', errors: [] };
}

/** Gộp message + danh sách lỗi chi tiết thành một chuỗi hiển thị. */
export function errorText(err: unknown): string {
  const info = parseApiError(err);
  return info.errors.length > 0 ? `${info.message} ${info.errors.join('; ')}` : info.message;
}

/** Bỏ các tham số undefined/rỗng khỏi query string. */
export function cleanParams<T extends object>(params: T): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value as string | number;
  }
  return out;
}
