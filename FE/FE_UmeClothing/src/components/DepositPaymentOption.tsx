import { shopInfo } from '../config/shop';
import { formatCurrency } from '../utils/format';

export default function DepositPaymentOption({
  amount,
  customerName,
  phone,
}: {
  amount: number;
  customerName: string;
  phone: string | null;
}) {
  const transferMemo = [customerName.trim(), phone?.trim()].filter(Boolean).join(' ') || 'Tên khách + số điện thoại';

  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50/70 p-4" aria-label="Phương thức đặt cọc">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[6px] border-brand-600 bg-white" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">Đặt cọc bằng chuyển khoản QR</p>
            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-800">VietinBank</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Cọc cần chuyển: <strong className="text-brand-800">{formatCurrency(amount)}</strong>
          </p>
          <p className="mt-1 break-words text-xs text-slate-500">
            Nội dung chuyển khoản: <strong className="text-slate-700">{transferMemo}</strong>
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Sau khi tạo đơn, trang tiếp theo sẽ hiển thị mã QR và thông tin thanh toán để bạn quét.
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-brand-100 pt-3">
        <div className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
          <img src={shopInfo.bank.qrUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
        </div>
        <p className="text-xs leading-5 text-slate-600">
          {shopInfo.bank.accountName}
          <br />
          STK {shopInfo.bank.accountNumber}
        </p>
      </div>
    </section>
  );
}
