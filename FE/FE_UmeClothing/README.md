# UmeClothing – Frontend (FE_UmeClothing)

React 18 + TypeScript + Vite + React Router 6 + Axios + TanStack Query 5 + Tailwind CSS 3 + `@microsoft/signalr`.

> **Trạng thái:** gồm phần khách hàng (kèm giỏ hàng nhiều sản phẩm) và phần Admin (`/admin/*`).
> Mã nguồn **chưa được `npm install` / `npm run build` thử** (môi trường tạo mã không có mạng).
> Chỉ mới kiểm tra được cú pháp bằng `tsc`. Hãy build và gửi log lỗi nếu có.

## Yêu cầu

- Node.js 20 LTS trở lên
- Backend `BE_UmeClothing` đang chạy (mặc định `https://localhost:7100`)
- Đã tin cậy chứng chỉ dev HTTPS: `dotnet dev-certs https --trust`
  (nếu không, trình duyệt sẽ chặn request và bạn sẽ thấy lỗi "Không kết nối được máy chủ")

## Chạy

```bash
npm install
npm run dev        # http://localhost:5173  (cổng cố định, khớp CORS của backend)
npm run build      # kiểm tra kiểu (tsc) + build production vào dist/
npm run preview
```

## Biến môi trường

Copy `.env.example` thành `.env` nếu backend không chạy ở `https://localhost:7100`:

```
VITE_API_URL=https://localhost:7100
```

Nếu đổi cổng/origin của frontend, nhớ thêm origin đó vào `Cors:AllowedOrigins` ở backend.

## Cấu trúc

```
src/
├── api/          # axios client + module gọi API (auth, products, categories, bookings)
├── components/   # UI dùng chung: ProductCard, AvailabilityCalendar, BookingPanel, ProductListing, ...
├── contexts/     # ToastContext, AuthContext, RealtimeContext (SignalR)
├── layouts/      # MainLayout (Navbar, Footer)
├── pages/        # Home, Products, ProductDetail, Category, Login, Register, Profile, MyBookings, BookingDetail
├── router/       # AppRouter, ProtectedRoute
├── types/        # kiểu dữ liệu khớp DTO backend
├── utils/        # dates, format, image, labels
├── hooks/, services/   # (để trống, dành cho phần Admin)
└── main.tsx
```

## Trang khách hàng

| Route | Mô tả |
|---|---|
| `/` | Trang chủ: danh mục + sản phẩm mới |
| `/products` | Danh sách: tìm kiếm, danh mục, giá, size, màu, còn trống theo khoảng ngày, sắp xếp, phân trang (bộ lọc nằm trên URL) |
| `/products/:slug` | Chi tiết: thư viện ảnh, giá/cọc, lịch availability, đặt thuê |
| `/categories/:slug` | Danh sách theo danh mục |
| `/login`, `/register` | Đăng nhập / đăng ký |
| `/forgot-password` | Quên mật khẩu: nhập email nhận mã OTP, rồi nhập mã + mật khẩu mới |
| `/profile` | Sửa họ tên/SĐT, đổi mật khẩu (email không tự đổi được) |
| `/bookings` | Đơn của tôi (chỉ role Customer) |
| `/cart` | Giỏ hàng nhiều sản phẩm: chọn một khoảng ngày chung, kiểm tra từng món, đặt một đơn |
| `/bookings/:id` | Chi tiết đơn, hủy đơn khi đang Pending |

## Trang quản trị (Admin/Staff)

Đăng nhập bằng `admin@umeclothing.com` / `staff@umeclothing.com` sẽ được chuyển tới `/admin`.

| Route | Mô tả |
|---|---|
| `/admin` | Tổng quan: số liệu cập nhật realtime (DASHBOARD_UPDATED), danh sách đơn chờ xác nhận |
| `/admin/products`, `/create`, `/:id/edit` | CRUD sản phẩm; upload nhiều ảnh, xóa, đổi ảnh chính, sắp xếp ảnh. Nút **Xóa sản phẩm** chỉ Admin thấy |
| `/admin/categories` | CRUD danh mục. Nút **Xóa danh mục** chỉ Admin thấy |
| `/admin/bookings` | Danh sách + tìm kiếm + lọc; đổi trạng thái theo state machine, ghi chú nội bộ |
| `/admin/customers` | Danh sách khách hàng. Nút **Khóa/Mở khóa** chỉ Admin thấy |
| `/admin/calendar` | Lịch thuê theo tháng, mỗi hàng một sản phẩm; tự cập nhật khi có thay đổi |

Đơn mới hiện toast ngay và danh sách/lịch tự làm mới, không cần F5. Chấm màu ở thanh trên cho biết trạng thái kết nối realtime.

## Realtime (SignalR)

- Một kết nối duy nhất tới `/hubs/notifications`, tự tạo lại khi đăng nhập/đăng xuất (JWT gửi qua `access_token`).
- Người chưa đăng nhập vẫn được kết nối để nhận `PRODUCT_AVAILABILITY_CHANGED` (dữ liệu công khai).
- Tự reconnect; sau khi reconnect, toàn bộ dữ liệu được tải lại từ REST vì có thể đã lỡ sự kiện.
- Trang chi tiết sản phẩm: lịch và kết quả kiểm tra cập nhật ngay khi có booking khác.
- Khách nhận toast khi cửa hàng đổi trạng thái đơn của họ.

## Quy tắc đặt thuê trên UI

- Chọn **ngày nhận** rồi **ngày trả**. Ngày trả là *exclusive*: sản phẩm bị giữ từ ngày nhận đến trước ngày trả.
- Các ngày bị chặn đã gồm **ngày đệm** do backend cấu hình (`Booking:BufferDays`).
- Giá hiển thị trên UI chỉ là **ước tính**. Tổng tiền chính thức do backend tính.
- Có 2 cách đặt: **Đặt thuê ngay** (một sản phẩm) hoặc **giỏ hàng** (nhiều sản phẩm, tối đa 10).
- Giỏ hàng chỉ lưu id + slug trong `localStorage` của trình duyệt (không đồng bộ giữa thiết bị); giá/trạng thái luôn lấy mới từ backend.
- Cả giỏ dùng **một khoảng ngày chung**. Lịch hiển thị hợp các ngày bị chặn của mọi món; sau khi chọn ngày, từng món được kiểm tra riêng.
- Đặt nhiều món là "tất cả hoặc không món nào": một món vừa bị người khác đặt thì cả đơn bị từ chối (409, kèm tên món) và giỏ được giữ nguyên để chỉnh.
- Tối đa 30 ngày/đơn (hằng số `MAX_RENTAL_DAYS` ở `src/utils/dates.ts`, cần khớp `Booking:MaxRentalDays` ở backend).
- Đơn Pending quá 24 giờ chưa được xác nhận sẽ tự hủy (backend).

## Giới hạn đã biết

- JWT lưu trong `localStorage` (đơn giản nhưng dễ bị đánh cắp nếu có lỗ hổng XSS).
- "Hôm nay" trên UI lấy theo giờ trình duyệt, còn backend tính theo UTC+7. Người dùng ở múi giờ khác có thể thấy lệch ngày ở rìa; backend luôn là nơi quyết định.
- Ảnh từ `LocalImageStorage` được ghép với `VITE_API_URL`; nếu dùng Cloudinary/R2 (URL tuyệt đối) thì dùng nguyên URL.
- Đổi email tự phục vụ chưa có (cần xác minh email, cố ý chưa làm). Khóa khách hàng không thu hồi JWT đã phát ngay lập tức — hiệu lực từ lần đăng nhập lại.
- Lịch admin lọc theo tên sản phẩm ở phía client trên dữ liệu của tháng đang xem; không hiển thị ngày đệm.
- Danh sách sản phẩm admin có phân trang 10/trang; trang lịch giới hạn 2000 mục/tháng (giới hạn của backend).
- Đổi email tự phục vụ chưa có (cần xác minh email, cố ý chưa làm).
- **Có refresh token** (access token 15 phút, refresh token 30 ngày, tự làm mới âm thầm khi gặp 401 — xem
  `api/client.ts`). Khóa tài khoản khiến refresh thất bại ở lần tới, nhưng access token đang dùng dở vẫn còn
  hiệu lực tới khi hết hạn tự nhiên (tối đa 15 phút) — không có cách thu hồi tức thì hoàn toàn.
- Cả access token và refresh token lưu ở `localStorage`: đơn giản, nhưng cùng rủi ro XSS.
- Ẩn nút theo `isAdmin`/`isStaff` chỉ là UX (đỡ bối rối cho Staff), KHÔNG phải lớp bảo mật — quyền thật nằm ở
  backend (`[Authorize(Roles = "Admin")]`). Ai đó gọi thẳng API bằng Postman với token Staff vẫn bị 403 đúng như
  mong đợi, dù nút không hiện trên UI.
- **Quên mật khẩu dùng OTP qua email**, KHÔNG qua SMS (xem lý do trong README backend, mục 8). Nếu backend
  chưa cấu hình `Smtp:*`, mã OTP KHÔNG được gửi đi đâu — nó chỉ nằm trong console log của backend, không nằm ở
  đâu trên UI. Sau khi backend đã cấu hình SMTP thật (ví dụ Brevo, xem README backend), mã sẽ tới hộp thư thật.
- Chưa có test tự động.
