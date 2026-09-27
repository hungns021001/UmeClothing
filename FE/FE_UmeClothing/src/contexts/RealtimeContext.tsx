import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../api/client';
import { useAuth } from './AuthContext';

export const REALTIME_EVENTS = [
  'BOOKING_CREATED',
  'BOOKING_STATUS_CHANGED',
  'PRODUCT_AVAILABILITY_CHANGED',
  'DASHBOARD_UPDATED',
] as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[number];
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

type Handler = (payload: unknown) => void;

interface RealtimeContextValue {
  status: ConnectionStatus;
  subscribe: (event: RealtimeEventName, handler: Handler) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * Quản lý một kết nối SignalR duy nhất.
 * - Kết nối ngay cả khi chưa đăng nhập (chỉ nhận PRODUCT_AVAILABILITY_CHANGED - dữ liệu công khai).
 * - Khi đăng nhập/đăng xuất, kết nối cũ bị đóng và kết nối mới được mở với JWT tương ứng.
 * - Tự reconnect; sau khi reconnect, làm mới toàn bộ dữ liệu từ REST vì có thể đã lỡ sự kiện.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  const queryClient = useQueryClient();
  const handlers = useRef(new Map<RealtimeEventName, Set<Handler>>());
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  const subscribe = useCallback((event: RealtimeEventName, handler: Handler) => {
    let set = handlers.current.get(event);
    if (!set) {
      set = new Set();
      handlers.current.set(event, set);
    }
    set.add(handler);
    return () => {
      handlers.current.get(event)?.delete(handler);
    };
  }, []);

  useEffect(() => {
    if (loading) return; // đợi xác thực token xong để không kết nối bằng token đã hết hạn

    let cancelled = false;
    let retryTimer: number | undefined;

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/notifications`, { accessTokenFactory: () => token ?? '' })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    for (const event of REALTIME_EVENTS) {
      connection.on(event, (payload: unknown) => {
        handlers.current.get(event)?.forEach((h) => h(payload));
      });
    }

    connection.onreconnecting(() => {
      if (!cancelled) setStatus('reconnecting');
    });
    connection.onreconnected(() => {
      if (cancelled) return;
      setStatus('connected');
      void queryClient.invalidateQueries();
    });
    connection.onclose(() => {
      if (!cancelled) setStatus('disconnected');
    });

    const start = async () => {
      if (cancelled) return;
      setStatus('connecting');
      try {
        await connection.start();
        if (!cancelled) setStatus('connected');
      } catch {
        if (cancelled) return;
        setStatus('disconnected');
        retryTimer = window.setTimeout(() => void start(), 5000);
      }
    };
    void start();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      void connection.stop();
    };
  }, [token, loading, queryClient]);

  const value = useMemo(() => ({ status, subscribe }), [status, subscribe]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime phải được dùng bên trong RealtimeProvider');
  return ctx;
}

/** Đăng ký handler cho một sự kiện realtime; tự hủy đăng ký khi component unmount. */
export function useRealtimeEvent<T>(event: RealtimeEventName, handler: (payload: T) => void): void {
  const { subscribe } = useRealtime();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => subscribe(event, (payload) => handlerRef.current(payload as T)), [event, subscribe]);
}
