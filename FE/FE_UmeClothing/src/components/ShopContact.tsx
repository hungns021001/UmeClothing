import { Link } from 'react-router-dom';
import { shopInfo, shopLinks } from '../config/shop';

function ContactIcon({ kind }: { kind: 'message' | 'location' }) {
  return kind === 'message' ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.8-3.1A7.5 7.5 0 1 1 20 11.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m8.5 12 2-2 2 2 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function FloatingShopContact() {
  return (
    <aside className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 sm:bottom-6 sm:right-6" aria-label="Liên hệ cửa hàng">
      <a
        href={shopLinks.messenger}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0866ff] px-4 text-sm font-semibold text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        aria-label="Nhắn tin UME Dress qua Messenger"
      >
        <ContactIcon kind="message" />
        <span>Messenger</span>
      </a>
      <a
        href={shopLinks.zalo}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0068ff] px-4 text-sm font-semibold text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        aria-label="Nhắn tin UME Dress qua Zalo"
      >
        <ContactIcon kind="message" />
        <span>Zalo</span>
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
        <Link to="/" className="text-lg font-bold text-brand-700">
          UME Dress
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
