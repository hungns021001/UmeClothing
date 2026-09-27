import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings';
import { errorText, parseApiError } from '../api/client';
import { productsApi } from '../api/products';
import { productVariantsApi } from '../api/productVariants';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import ImagePlaceholder from '../components/ImagePlaceholder';
import { Skeleton } from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useRealtimeEvent } from '../contexts/RealtimeContext';
import { useToast } from '../contexts/ToastContext';
import type { Product, ProductAvailabilityChangedEvent } from '../types';
import { MAX_RENTAL_DAYS, diffDays } from '../utils/dates';
import { formatCurrency, formatDate } from '../utils/format';
import { resolveImageUrl } from '../utils/image';

export default function CartPage() {
  const { items, remove, clear } = useCart();
  const { isAuthenticated, isCustomer, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const datesReady = !!startDate && !!endDate;

  // Thông tin mới nhất của từng sản phẩm (giá, trạng thái, danh sách size) - giỏ chỉ lưu variantId + slug.
  // Hai variant cùng 1 Product (2 size của cùng sản phẩm) dùng chung cache nhờ cùng queryKey.
  const productQueries = useQueries({
    queries: items.map((i) => ({
      queryKey: ['product', i.slug],
      queryFn: () => productsApi.getBySlug(i.slug),
    })),
  });

  // Lịch bị chặn của từng variant; lịch chung = hợp của tất cả (mọi món phải cùng trống trong khoảng đã chọn).
  const rangeQueries = useQueries({
    queries: items.map((item, idx) => {
      const productId = productQueries[idx]?.data?.id;
      return {
        queryKey: ['availability', item.variantId, 'ranges'],
        queryFn: () => productVariantsApi.availability(productId as number, item.variantId),
        enabled: !!productId,
      };
    }),
  });

  // Kiểm tra từng món với backend khi đã chọn đủ ngày.
  const checkQueries = useQueries({
    queries: items.map((item, idx) => {
      const productId = productQueries[idx]?.data?.id;
      return {
        queryKey: ['availability', item.variantId, 'check', startDate, endDate],
        queryFn: () => productVariantsApi.availability(productId as number, item.variantId, startDate as string, endDate as string),
        enabled: !!productId && datesReady,
      };
    }),
  });

  useRealtimeEvent<ProductAvailabilityChangedEvent>('PRODUCT_AVAILABILITY_CHANGED', (e) => {
    if (items.some((i) => i.variantId === e.variantId)) {
      void queryClient.invalidateQueries({ queryKey: ['availability', e.variantId] });
    }
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      bookingsApi.create({
        startDate: startDate as string,
        endDate: endDate as string,
        customerNote: note.trim() || undefined,
        items: items.map((i) => ({ variantId: i.variantId })),
      }),
    onSuccess: (booking) => {
      setConfirmOpen(false);
      clear();
      toast('success', `Đặt thuê thành công (${booking.bookingCode}). Đơn đang chờ cửa hàng xác nhận.`);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate(`/bookings/${booking.id}`);
    },
    onError: (err) => {
      setConfirmOpen(false);
      // Đặt nhiều size là "tất cả hoặc không món nào": một size trùng lịch thì cả đơn bị từ chối (409, kèm tên).
      toast('error', errorText(err));
      if (parseApiError(err).status === 409) {
        for (const i of items) void queryClient.invalidateQueries({ queryKey: ['availability', i.variantId] });
      }
    },
  });

  if (items.length === 0) {
    return (
      <EmptyState
        title="Giỏ hàng đang trống"
        description="Thêm các sản phẩm bạn muốn thuê cùng nhau, sau đó chọn ngày một lần cho cả đơn."
        action={
          <Link to="/products" className="btn-primary">
            Xem sản phẩm
          </Link>
        }
      />
    );
  }

  const blockedUnion = rangeQueries.flatMap((q) => q.data?.blockedRanges ?? []);
  const days = datesReady ? diffDays(startDate as string, endDate as string) : 0;
  const tooLong = days > MAX_RENTAL_DAYS;

  const rows = items.map((item, idx) => {
    const product: Product | undefined = productQueries[idx]?.data;
    const productError = productQueries[idx]?.error;
    const check = checkQueries[idx];
    const gone = !!productQueries[idx]?.isError && parseApiError(productError).status === 404;
    const variant = product?.variants.find((v) => v.id === item.variantId);
    const variantGone = !!product && !variant; // admin đã xóa size này khỏi sản phẩm
    const maintenance = product?.status === 'Maintenance' || variant?.status === 'Maintenance' || variant?.status === 'Hidden';
    let state: 'loading' | 'gone' | 'maintenance' | 'checking' | 'ok' | 'conflict' | 'idle' = 'idle';
    if (productQueries[idx]?.isLoading) state = 'loading';
    else if (gone || variantGone) state = 'gone';
    else if (maintenance) state = 'maintenance';
    else if (datesReady && check?.isFetching) state = 'checking';
    else if (datesReady && check?.data?.isAvailable === true) state = 'ok';
    else if (datesReady && (check?.data?.isAvailable === false || check?.isError)) state = 'conflict';
    return { item, product, variant, state, conflicts: check?.data?.conflicts ?? [] };
  });

  const hasBroken = rows.some((r) => r.state === 'gone' || r.state === 'maintenance');
  const allOk = datesReady && !tooLong && rows.every((r) => r.state === 'ok');

  const rental = rows.reduce((sum, r) => sum + (r.product ? r.product.rentalPrice * days : 0), 0);
  const deposit = rows.reduce((sum, r) => sum + (r.product ? r.product.depositPrice : 0), 0);

  const onCheckoutClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Giỏ hàng ({items.length})</h1>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <section className="space-y-4">
          {rows.map(({ item, product, variant, state, conflicts }) => {
            const img = resolveImageUrl(product?.images.find((i) => i.isPrimary)?.url ?? product?.images[0]?.url);
            return (
              <article key={item.variantId} className="card flex gap-4 p-4">
                <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {state === 'loading' ? (
                    <Skeleton className="h-full w-full" />
                  ) : img ? (
                    <img src={img} alt={product?.name ?? ''} className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlaceholder className="h-full w-full" />
                  )}
                </div>

                <div className="min-w-0 flex-1 text-sm">
                  {product && variant ? (
                    <>
                      <Link to={`/products/${product.slug}`} className="font-semibold text-slate-900 hover:text-brand-700">
                        {product.name}
                      </Link>
                      <p className="mt-1 text-slate-500">
                        Size {variant.size} · {product.color}
                      </p>
                      <p className="mt-1">
                        <span className="font-medium text-brand-700">{formatCurrency(product.rentalPrice)}</span>
                        <span className="text-slate-400"> / ngày · cọc {formatCurrency(product.depositPrice)}</span>
                      </p>
                    </>
                  ) : state === 'gone' ? (
                    <p className="font-medium text-red-600">Sản phẩm/size không còn tồn tại hoặc đã bị ẩn.</p>
                  ) : (
                    <Skeleton className="h-10 w-2/3" />
                  )}

                  {state === 'maintenance' && <p className="mt-2 text-amber-700">Size này hiện không nhận đặt thuê (đang bảo trì).</p>}
                  {state === 'checking' && <p className="mt-2 text-slate-500">Đang kiểm tra...</p>}
                  {state === 'ok' && <p className="mt-2 font-medium text-emerald-700">✓ Còn trống trong khoảng đã chọn</p>}
                  {state === 'conflict' && (
                    <div className="mt-2 text-red-600">
                      <p className="font-medium">✗ Không còn trống trong khoảng đã chọn</p>
                      {conflicts.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-xs">
                          {conflicts.map((c) => (
                            <li key={`${c.start}-${c.end}`}>
                              Đã có lịch: {formatDate(c.start)} → {formatDate(c.end)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <button type="button" className="mt-2 text-xs text-slate-500 underline hover:text-red-600" onClick={() => remove(item.variantId)}>
                    Xóa khỏi giỏ
                  </button>
                </div>
              </article>
            );
          })}

          <Link to="/products" className="inline-block text-sm font-medium text-brand-700 hover:underline">
            ← Tiếp tục chọn sản phẩm
          </Link>
        </section>

        <aside className="card h-fit space-y-5 p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Chọn thời gian thuê cho cả đơn</h2>
            <p className="mt-1 text-xs text-slate-500">
              Tất cả sản phẩm/size dùng chung một khoảng ngày. Lịch bên dưới đánh dấu ngày đã có lịch của <strong>bất kỳ</strong> món nào trong giỏ.
            </p>
          </div>

          {rangeQueries.some((q) => q.isLoading) ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <AvailabilityCalendar
              blockedRanges={blockedUnion}
              startDate={startDate}
              endDate={endDate}
              onChange={(s, e) => {
                setStartDate(s);
                setEndDate(e);
              }}
              onMessage={setCalendarMessage}
            />
          )}

          {calendarMessage && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
              {calendarMessage}
            </p>
          )}

          {startDate && (
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày nhận</span>
                <span className="font-medium">{formatDate(startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày trả</span>
                <span className="font-medium">{endDate ? formatDate(endDate) : 'Chọn ngày trả trên lịch'}</span>
              </div>
              {endDate && (
                <>
                  {tooLong && <p className="text-red-600">Thời gian thuê tối đa {MAX_RENTAL_DAYS} ngày.</p>}
                  <hr className="border-slate-200" />
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tiền thuê ({days} ngày)</span>
                    <span>{formatCurrency(rental)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tiền cọc</span>
                    <span>{formatCurrency(deposit)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Tạm tính</span>
                    <span className="text-brand-700">{formatCurrency(rental + deposit)}</span>
                  </div>
                  <p className="text-xs text-slate-400">Đây là số ước tính. Tổng tiền chính thức do hệ thống tính khi tạo đơn.</p>
                </>
              )}
              <button
                type="button"
                className="text-xs text-slate-500 underline"
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                  setCalendarMessage(null);
                }}
              >
                Chọn lại ngày
              </button>
            </div>
          )}

          {datesReady && (
            <div>
              <label htmlFor="cart-note" className="label">
                Ghi chú (không bắt buộc)
              </label>
              <textarea id="cart-note" className="input min-h-[72px]" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}

          {hasBroken && <p className="text-sm text-red-600">Hãy xóa các sản phẩm/size không khả dụng khỏi giỏ để tiếp tục.</p>}
          {datesReady && !hasBroken && rows.some((r) => r.state === 'conflict') && (
            <p className="text-sm text-red-600">Có size không còn trống. Hãy chọn khoảng ngày khác hoặc xóa khỏi giỏ.</p>
          )}
          {isAuthenticated && !isCustomer && (
            <p className="text-sm text-slate-500">Tài khoản {user?.role} không thể đặt thuê. Hãy dùng tài khoản khách hàng.</p>
          )}

          <button
            type="button"
            className="btn-primary w-full py-3"
            disabled={hasBroken || !allOk || (isAuthenticated && !isCustomer)}
            onClick={onCheckoutClick}
          >
            {isAuthenticated ? `Đặt thuê ${items.length} sản phẩm` : 'Đăng nhập để đặt thuê'}
          </button>
        </aside>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Xác nhận đặt thuê"
        confirmLabel="Đặt thuê"
        loading={checkoutMutation.isPending}
        onConfirm={() => checkoutMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
      >
        <ul className="list-disc pl-5">
          {rows.map((r) => (
            <li key={r.item.variantId}>
              {r.product?.name ?? r.item.slug} {r.variant ? `(size ${r.variant.size})` : ''}
            </li>
          ))}
        </ul>
        {startDate && endDate && (
          <p className="mt-2">
            Từ {formatDate(startDate)} đến {formatDate(endDate)} ({days} ngày)
          </p>
        )}
        <p className="mt-1">
          Tạm tính: <strong>{formatCurrency(rental + deposit)}</strong> (đã gồm cọc {formatCurrency(deposit)})
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Đơn được đặt cho tất cả sản phẩm cùng lúc: nếu một sản phẩm vừa bị người khác đặt, cả đơn sẽ không được tạo. Đơn Pending quá 24 giờ chưa được xác nhận sẽ tự hủy.
        </p>
      </ConfirmModal>
    </div>
  );
}
