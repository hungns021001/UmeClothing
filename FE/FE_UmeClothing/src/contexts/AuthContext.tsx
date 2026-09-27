import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, type RegisterPayload } from '../api/auth';
import { refreshTokenStore, setTokenRefreshedHandler, setUnauthorizedHandler, tokenStore } from '../api/client';
import type { User } from '../types';
import { useToast } from './ToastContext';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  /** true trong lúc xác thực lại token đã lưu khi tải trang. */
  loading: boolean;
  isAuthenticated: boolean;
  isCustomer: boolean;
  /** true cho cả Staff và Admin (quyền vận hành hàng ngày). */
  isStaff: boolean;
  /** true CHỈ cho Admin — dùng cho thao tác nhạy cảm: xóa sản phẩm/danh mục, khóa tài khoản khách hàng. */
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  /** Cập nhật user trong bộ nhớ sau khi sửa hồ sơ thành công, không cần gọi lại /auth/me. */
  setLocalUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => tokenStore.get() !== null || refreshTokenStore.get() !== null);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    refreshTokenStore.clear();
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const logout = useCallback(() => {
    const refreshToken = refreshTokenStore.get();
    clearSession();
    // Tốt nhất có thể: báo cho backend thu hồi refresh token. Không chờ kết quả — dù request này lỗi,
    // phiên vẫn đã bị xóa ở phía trình duyệt và refresh token sẽ tự hết hạn sau cùng.
    if (refreshToken) void authApi.logout(refreshToken).catch(() => undefined);
  }, [clearSession]);

  // Access token hết hạn: api/client.ts tự thử refresh trước; chỉ khi refresh cũng thất bại (refresh token
  // hết hạn/bị thu hồi do đổi mật khẩu hoặc bị khóa) thì mới đăng xuất ở đây.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      toast('info', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession, toast]);

  // Access token được âm thầm làm mới (interceptor 401 -> refresh) ở một request bất kỳ: cập nhật state
  // để nơi khác (kết nối SignalR) biết mà dùng token mới.
  useEffect(() => {
    setTokenRefreshedHandler((newToken) => setToken(newToken));
    return () => setTokenRefreshedHandler(null);
  }, []);

  // Xác thực lại token đã lưu khi mở trang. Nếu access token đã hết hạn, gọi /auth/me sẽ nhận 401 và
  // api/client.ts tự thử refresh trước khi trả lỗi về đây, nên không cần xử lý refresh riêng ở effect này.
  useEffect(() => {
    if (!tokenStore.get() && !refreshTokenStore.get()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Chỉ chạy một lần khi mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyAuth = useCallback((auth: { token: string; refreshToken: string; user: User }) => {
    tokenStore.set(auth.token);
    refreshTokenStore.set(auth.refreshToken);
    setToken(auth.token);
    setUser(auth.user);
    return auth.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => applyAuth(await authApi.login(email, password)),
    [applyAuth],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => applyAuth(await authApi.register(payload)),
    [applyAuth],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: user !== null,
      isCustomer: user?.role === 'Customer',
      isStaff: user?.role === 'Admin' || user?.role === 'Staff',
      isAdmin: user?.role === 'Admin',
      login,
      register,
      logout,
      setLocalUser: setUser,
    }),
    [user, token, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return ctx;
}
