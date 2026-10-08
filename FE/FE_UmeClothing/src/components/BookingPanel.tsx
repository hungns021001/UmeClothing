import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings';
import { parseApiError, errorText } from '../api/client';
import { productVariantsApi } from '../api/productVariants';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useRealtimeEvent } from '../contexts/RealtimeContext';
import { useToast } from '../contexts/ToastContext';
import type { Product, ProductAvailabilityChangedEvent, ProductVariant } from '../types';
import { MAX_RENTAL_DAYS, diffDays } from '../utils/dates';
import { formatCurrency, formatDate } from '../utils/format';
import AvailabilityCalendar from './AvailabilityCalendar';
import ConfirmModal from './ConfirmModal';
import ErrorState from './ErrorState';
import GuestContactFields, { validateGuestContact, type GuestContact } from './GuestContactFields';
import { Skeleton } from './Skeleton';

/** Đặt thuê cho MỘT size cụ thể (variant) của sản phẩm — mỗi size có lịch riêng. */
export default function BookingPanel({ product, variant }: { product: Product; variant: ProductVariant }) {
  const { user, isAuthenticated, isCustomer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const cart = useCart();

  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [guest, setGuest] = useState<GuestContact>({ name: '', phone: '' });
  const [guestError, setGuestError] = useState<string | null>(null);

  const bookable = product.status === 'Available' && variant.status === 'Available';

  // Lịch các ngày đã bị chặn (riêng cho size này).
  const rangesQuery = useQuery({
    queryKey: ['availability', variant.id, 'ranges'],
    queryFn: () => productVariantsApi.availability(product.id, variant.id),
    enabled: bookable,
  });

  // Kiểm tra lại với backend khi đã chọn đủ ngày (backend là nguồn quyết định).
  const checkQuery = useQuery({
    queryKey: ['availability', variant.id, 'check', startDate, endDate],
    queryFn: () => productVariantsApi.availability(product.id, variant.id, startDate as string, endDate as string),
    enabled: bookable && !!startDate && !!endDate,
  });

  // Có booking khác vừa thay đổi lịch của size này -> tải lại (prefix 'availability' + id khớp cả hai query trên).
  useRealtimeEvent<ProductAvailabilityChangedEvent>('PRODUCT_AVAILABILITY_CHANGED', (e) => {
    if (e.variantId === variant.id) {
      void queryClient.invalidateQueries({ queryKey: ['availability', variant.id] });
    }
  });

  const createMutation = useMutation({
    mutationFn: () =>
      isAuthenticated
        ? bookingsApi.create({
            startDate: startDate as string,
            endDate: endDate as string,
            customerNote: note.trim() || undefined,
            items: [{ variantId: variant.id }],
          })
        : bookingsApi.createGuest({
            guestName: guest.name.trim(),
            guestPhone: guest.phone.trim(),
            startDate: startDate as string,
            endDate: endDate as string,
            customerNote: note.trim() || undefined,
            items: [{ variantId: variant.id }],
          }),
    onSuccess: (booking) => {
      setConfirmOpen(false);
      toast('success', `Đặt thuê thành công (${booking.bookingCode}). Đơn đang chờ cửa hàng xác nhận.`);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate(`/bookings/${booking.id}`);
    },
    onError: (err) => {
      setConfirmOpen(false);
      toast('error', errorText(err));
      if (parseApiError(err).status === 409) {
        void queryClient.invalidateQueries({ queryKey: ['availability', variant.id] });
      }
    },
  });

  if (!bookable) {
    return (
      <div className="card border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        {product.status !== 'Available'
          ? 'Sản phẩm này hiện tạm ngưng nhận đặt thuê.'
          : `Size ${variant.size} hiện không nhận đặt thuê (đang bảo trì/giặt ủi).`}{' '}
        Vui lòng chọn size khác hoặc quay lại sau.
      </div>
    );
  }

  const days = startDate && endDate ? diffDays(startDate, endDate) : 0;
  const tooLong = days > MAX_RENTAL_DAYS;
  const rental = product.rentalPrice * days;
  const total = rental + product.depositPrice;

  const check = checkQuery.data;
  const isAvailable = check?.isAvailable === true;
  const isUnavailable = check?.isAvailable === false;
  const canBook = isCustomer && !!startDate && !!endDate && isAvailable && !tooLong && !checkQuery.isFetching;

  const handleBookClick = () => {
    if (!isAuthenticated) {
      const err = validateGuestContact(guest);
      setGuestError(err);
      if (err) return;
    }
    setConfirmOpen(true);
  };

  const resetDates = () => {
    setStartDate(null);
    setEndDate(null);
    setCalendarMessage(null);
  };

  return (
    <div className="card space-y-5 p-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Chọn thời gian thuê — Size {variant.size}</h2>
        <p className="mt-1 text-xs text-slate-500">
          Bấm <strong>ngày nhận</strong> rồi <strong>ngày trả</strong>. Sản phẩm được giữ từ ngày nhận đến trước ngày trả.
        </p>
      </div>

      {rangesQuery.isLoading && <Skeleton className="h-64 w-full" />}
      {rangesQuery.isError && (
        <ErrorState message={errorText(rangesQuery.error)} onRetry={() => void rangesQuery.refetch()} />
      )}
      {rangesQuery.data && (
        <AvailabilityCalendar
          blockedRanges={rangesQuery.data.blockedRanges}
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
        <div className="space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
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

              {checkQuery.isFetching && <p className="text-slate-500">Đang kiểm tra tình trạng...</p>}
              {checkQuery.isError && <p className="text-red-600">{errorText(checkQuery.error)}</p>}
              {!checkQuery.isFetching && isAvailable && (
                <p className="font-medium text-emerald-700">✓ Size {variant.size} còn trống trong khoảng thời gian này.</p>
              )}
              {!checkQuery.isFetching && isUnavailable && (
                <div className="text-red-600">
                  <p className="font-medium">✗ {check?.reason ?? 'Size này không còn trống.'}</p>
                  {check && check.conflicts.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-xs">
                      {check.conflicts.map((c) => (
                        <li key={`${c.start}-${c.end}`}>
                          Đã có lịch: {formatDate(c.start)} → {formatDate(c.end)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <hr className="border-slate-200" />
              <div className="flex justify-between">
                <span className="text-slate-500">
                  Tiền thuê ({days} ngày × {formatCurrency(product.rentalPrice)})
                </span>
                <span>{formatCurrency(rental)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tiền cọc</span>
                <span>{formatCurrency(product.depositPrice)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Tạm tính</span>
                <span className="text-brand-700">{formatCurrency(total)}</span>
              </div>
              <p className="text-xs text-slate-400">
                Đây là số ước tính. Tổng tiền chính thức do hệ thống tính khi tạo đơn.
              </p>
            </>
          )}

          <button type="button" className="text-xs text-slate-500 underline" onClick={resetDates}>
            Chọn lại ngày
          </button>
        </div>
      )}

      {startDate && endDate && (
        <div>
          <label htmlFor="customer-note" className="label">
            Ghi chú (không bắt buộc)
          </label>
          <textarea
            id="customer-note"
            className="input min-h-[72px]"
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: cần nhận sớm buổi sáng..."
          />
        </div>
      )}

      {isAuthenticated && !isCustomer && (
        <p className="text-sm text-slate-500">Tài khoản {user?.role} không thể đặt thuê. Hãy dùng tài khoản khách hàng.</p>
      )}

      {!isAuthenticated && (startDate && endDate) && (
        guestMode ? (
          <>
            <GuestContactFields value={guest} onChange={setGuest} />
            {guestError && (
              <p className="text-sm text-red-600" role="alert">
                {guestError}
              </p>
            )}
          </>
        ) : (
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => navigate('/login', { state: { from: location.pathname } })}>
              Đăng nhập để đặt
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setGuestMode(true)}>
              Đặt không cần tài khoản
            </button>
          </div>
        )
      )}

      {(isAuthenticated || guestMode) && (
        <button
          type="button"
          className="btn-primary w-full py-3"
          disabled={isAuthenticated ? !canBook : !startDate || !endDate || !isAvailable || tooLong}
          onClick={handleBookClick}
        >
          Đặt thuê ngay
        </button>
      )}

      {!(isAuthenticated && !isCustomer) &&
        (cart.has(variant.id) ? (
          <Link to="/cart" className="btn-secondary w-full py-3">
            Đã trong giỏ – Xem giỏ hàng
          </Link>
        ) : (
          <button
            type="button"
            className="btn-secondary w-full py-3"
            onClick={() => {
              const result = cart.add({ variantId: variant.id, slug: product.slug });
              if (result === 'added') toast('success', 'Đã thêm vào giỏ hàng.');
              else if (result === 'full') toast('error', 'Giỏ hàng đã đạt tối đa số sản phẩm cho một đơn.');
            }}
          >
            Thêm vào giỏ (đặt cùng sản phẩm khác)
          </button>
        ))}

      <ConfirmModal
        open={confirmOpen}
        title="Xác nhận đặt thuê"
        confirmLabel="Đặt thuê"
        loading={createMutation.isPending}
        onConfirm={() => createMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
      >
        <p>
          <strong>
            {product.name} — Size {variant.size}
          </strong>
        </p>
        {!isAuthenticated && (
          <p className="mt-1 text-slate-600">
            {guest.name} · {guest.phone}
          </p>
        )}
        {startDate && endDate && (
          <p className="mt-1">
            Từ {formatDate(startDate)} đến {formatDate(endDate)} ({days} ngày)
          </p>
        )}
        <p className="mt-1">
          Tạm tính: <strong>{formatCurrency(total)}</strong> (đã gồm cọc {formatCurrency(product.depositPrice)})
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Đơn sẽ ở trạng thái “Chờ xác nhận”. Nếu cửa hàng chưa xác nhận trong 24 giờ, đơn sẽ tự động hủy.
        </p>
      </ConfirmModal>
    </div>
  );
}
