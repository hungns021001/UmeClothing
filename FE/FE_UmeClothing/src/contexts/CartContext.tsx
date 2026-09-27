import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** Giỏ đặt theo SIZE (variant) cụ thể, không phải theo Product — mỗi variant có lịch riêng. */
export interface CartItem {
  variantId: number;
  /** Slug của Product chứa variant này, để tải lại thông tin (tên, ảnh, giá, size) từ backend. */
  slug: string;
}

/** Khớp Booking:MaxItemsPerBooking ở backend (mặc định 10). */
export const MAX_CART_ITEMS = 10;

const STORAGE_KEY = 'ume_cart_v2';

type AddResult = 'added' | 'exists' | 'full';

interface CartContextValue {
  items: CartItem[];
  count: number;
  has: (variantId: number) => boolean;
  add: (item: CartItem) => AddResult;
  remove: (variantId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is CartItem =>
          typeof x === 'object' && x !== null && typeof (x as CartItem).variantId === 'number' && typeof (x as CartItem).slug === 'string',
      )
      .slice(0, MAX_CART_ITEMS);
  } catch {
    return [];
  }
}

/**
 * Giỏ chỉ lưu variantId + slug (không lưu giá/size) để trang giỏ luôn lấy dữ liệu mới nhất từ backend.
 * Lưu ở localStorage của trình duyệt; không đồng bộ giữa các thiết bị.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* bỏ qua: trình duyệt chặn storage */
    }
  }, [items]);

  const has = useCallback((variantId: number) => items.some((i) => i.variantId === variantId), [items]);

  const add = useCallback(
    (item: CartItem): AddResult => {
      if (items.some((i) => i.variantId === item.variantId)) return 'exists';
      if (items.length >= MAX_CART_ITEMS) return 'full';
      setItems((prev) => [...prev, item]);
      return 'added';
    },
    [items],
  );

  const remove = useCallback((variantId: number) => setItems((prev) => prev.filter((i) => i.variantId !== variantId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({ items, count: items.length, has, add, remove, clear }), [items, has, add, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart phải được dùng bên trong CartProvider');
  return ctx;
}
