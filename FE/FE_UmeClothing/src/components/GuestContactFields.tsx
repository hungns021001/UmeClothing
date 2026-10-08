const PHONE_RE = /^\+?[0-9\s-]{8,20}$/;

export interface GuestContact {
  name: string;
  phone: string;
}

export function validateGuestContact(c: GuestContact): string | null {
  if (c.name.trim().length < 2) return 'Họ tên phải có ít nhất 2 ký tự.';
  if (!PHONE_RE.test(c.phone.trim())) return 'Số điện thoại không hợp lệ.';
  return null;
}

/** Form Tên + SĐT cho khách đặt thuê không cần tài khoản. Nhớ ghi lại SĐT: dùng để tra cứu đơn sau này. */
export default function GuestContactFields({ value, onChange }: { value: GuestContact; onChange: (v: GuestContact) => void }) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
      <p className="text-xs text-slate-500">
        Đặt không cần tài khoản — ghi nhớ đúng <strong>số điện thoại</strong> bên dưới để tra cứu/hủy đơn sau này.
      </p>
      <div>
        <label htmlFor="guest-name" className="label">
          Họ và tên *
        </label>
        <input
          id="guest-name"
          className="input"
          maxLength={150}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          autoComplete="name"
        />
      </div>
      <div>
        <label htmlFor="guest-phone" className="label">
          Số điện thoại *
        </label>
        <input
          id="guest-phone"
          type="tel"
          className="input"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          autoComplete="tel"
        />
      </div>
    </div>
  );
}
