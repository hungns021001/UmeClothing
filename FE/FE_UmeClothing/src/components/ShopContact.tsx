import { Link } from 'react-router-dom';
import { shopInfo, shopLinks } from '../config/shop';

function MessengerLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className="h-9 w-9">
      <circle cx="20" cy="20" r="20" fill="#0866ff" />
      <path
        d="M20 8.5c-7 0-12 4.9-12 11.5 0 3.4 1.4 6.3 3.8 8.2v4.4l4.3-2.4c1.2.3 2.5.5 3.9.5 7 0 12-4.8 12-11.2S27 8.5 20 8.5Z"
        fill="white"
      />
      <path d="m12.8 23.7 6.1-6.5 3.1 3.1 5.2-3.1-6.1 6.5-3.1-3.1-5.2 3.1Z" fill="#0866ff" />
    </svg>
  );
}

function ZaloLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className="h-9 w-9">
      <circle cx="20" cy="20" r="20" fill="#0068ff" />
      <path
        d="M10.5 12.5h19v12.2a2.8 2.8 0 0 1-2.8 2.8h-8.1l-5.2 3v-3h-.1a2.8 2.8 0 0 1-2.8-2.8V12.5Z"
        fill="white"
      />
      <text x="20" y="22.7" textAnchor="middle" fill="#0068ff" fontSize="9" fontWeight="800" fontFamily="Arial, sans-serif">
        Zalo
      </text>
    </svg>
  );
}

export function FloatingShopContact() {
  return (
    <aside className="fixed bottom-4 right-4 z-40 flex flex-col gap-3 sm:bottom-6 sm:right-6" aria-label="Liên hệ cửa hàng">
      <a
        href={shopLinks.messenger}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white shadow-[0_8px_24px_rgba(8,102,255,0.24)] transition duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_12px_30px_rgba(8,102,255,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        aria-label="Nhắn tin UME Dress qua Messenger"
        title="Nhắn tin qua Messenger"
      >
        <MessengerLogo />
        <span className="pointer-events-none absolute right-[calc(100%+0.75rem)] whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Nhắn qua Messenger
        </span>
      </a>
      <a
        href={shopLinks.zalo}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white shadow-[0_8px_24px_rgba(0,104,255,0.24)] transition duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_12px_30px_rgba(0,104,255,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        aria-label="Nhắn tin UME Dress qua Zalo"
        title="Nhắn tin qua Zalo"
      >
        <ZaloLogo />
        <span className="pointer-events-none absolute right-[calc(100%+0.75rem)] whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Nhắn qua Zalo
        </span>
      </a>
    </aside>
  );
}

export function ShopContactSection() {
  return (
    <section id="lien-he" className="scroll-mt-24">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Ghé thăm cửa hàng</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">UME Dress luôn sẵn sàng hỗ trợ bạn</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Tư vấn chọn trang phục phù hợp cho buổi tiệc, buổi chụp hình và những dịp đặc biệt.
        </p>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5 p-6 sm:p-8">
          <div>
            <h3 className="font-semibold text-slate-900">Địa chỉ cửa hàng</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{shopInfo.address}</p>
            <p className="text-sm leading-6 text-slate-500">{shopInfo.addressNote}</p>
            <a
              href={shopLinks.directions}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
            >
              Xem chỉ đường <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Hotline</h3>
              <a href={`tel:${shopInfo.phoneLink}`} className="mt-1 inline-block text-sm text-brand-700 hover:underline">
                {shopInfo.phone}
              </a>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Giờ mở cửa</h3>
              <p className="mt-1 text-sm text-slate-600">{shopInfo.openingHours}</p>
            </div>
          </div>

          <div className="rounded-xl bg-brand-50 p-4">
            <p className="text-sm font-medium text-slate-800">Giá thuê từ {shopInfo.startingPrice}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Nhắn shop để được tư vấn mẫu và kiểm tra lịch trống.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={shopLinks.messenger} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Nhắn Messenger
              </a>
              <a href={shopLinks.zalo} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Nhắn Zalo
              </a>
            </div>
          </div>
        </div>

        <div className="min-h-72 bg-slate-100 lg:min-h-full">
          <iframe
            title={`Bản đồ vị trí ${shopInfo.name}`}
            src={shopLinks.mapEmbed}
            className="h-full min-h-72 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

export function CustomerFeedbackSection() {
  return (
    <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Chia sẻ cùng UME</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Feedback của bạn giúp shop tốt hơn</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Shop đang lắng nghe những chia sẻ đầu tiên từ khách hàng. Hãy nhắn cho UME về trải nghiệm thuê đồ, mẫu bạn yêu thích hoặc điều shop có thể phục vụ tốt hơn.
        </p>
        <a
          href={shopLinks.messenger}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-5"
        >
          Gửi feedback qua Messenger
        </a>
      </div>
    </section>
  );
}

export function FooterShopLinks() {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Link to="/" className="inline-flex items-center gap-3">
          <img src={shopInfo.logoUrl} alt="" className="h-14 w-14 rounded-full object-contain" loading="lazy" />
          <span className="text-lg font-bold text-brand-700">UME Dress</span>
        </Link>
        <p className="mt-2 text-sm leading-6 text-slate-500">{shopInfo.description}</p>
        <p className="mt-2 text-sm font-medium text-slate-700">Giá thuê từ {shopInfo.startingPrice}</p>
      </div>
      <div>
        <h2 className="font-semibold text-slate-900">Liên hệ</h2>
        <a href={`tel:${shopInfo.phoneLink}`} className="mt-3 block text-sm text-slate-600 hover:text-brand-700">
          Hotline: {shopInfo.phone}
        </a>
        <p className="mt-2 text-sm text-slate-600">{shopInfo.openingHours}</p>
      </div>
      <div>
        <h2 className="font-semibold text-slate-900">Địa chỉ</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{shopInfo.address}</p>
        <p className="text-sm leading-6 text-slate-500">{shopInfo.addressNote}</p>
        <a href={shopLinks.directions} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">
          Mở bản đồ
        </a>
      </div>
      <div>
        <h2 className="font-semibold text-slate-900">Kết nối với UME</h2>
        <a href={shopLinks.messenger} target="_blank" rel="noopener noreferrer" className="mt-3 block text-sm text-slate-600 hover:text-brand-700">
          Facebook / Messenger
        </a>
        <a href={shopLinks.zalo} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-slate-600 hover:text-brand-700">
          Zalo
        </a>
        <Link to="/products" className="mt-2 inline-block text-sm text-slate-600 hover:text-brand-700">
          Khám phá trang phục
        </Link>
      </div>
    </div>
  );
}
