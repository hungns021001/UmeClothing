# UmeClothing – Backend (BE_UmeClothing)

ASP.NET Core 8 Web API + EF Core 8 (SQL Server) + JWT + SignalR cho hệ thống cho thuê quần áo.

> **Lưu ý trung thực:** mã nguồn này được viết mà **chưa được biên dịch/chạy thử** (môi trường tạo mã không có .NET SDK).
> Hãy chạy `dotnet build` trước; nếu có lỗi, gửi log để sửa.

## 1. Yêu cầu

| Thành phần | Phiên bản |
|---|---|
| .NET SDK | 8.0.x |
| SQL Server | 2019+ / Express / LocalDB |
| dotnet-ef (CLI) | 8.x (`dotnet tool install --global dotnet-ef --version 8.*`) |
| Node (cho frontend) | 20 LTS trở lên |

Chỉ dùng EF Core **8.x**. Không nâng lên EF Core 9/10.

## 2. Cấu hình

`appsettings.json` (mặc định) + `appsettings.Development.json` (chỉ dev).

| Khóa | Ý nghĩa |
|---|---|
| `ConnectionStrings:DefaultConnection` | Chuỗi kết nối SQL Server (mặc định LocalDB) |
| `Jwt:Key` | **Bắt buộc**, ≥ 32 ký tự. Lưu ngoài mã nguồn bằng user-secrets hoặc biến môi trường |
| `Jwt:Issuer`, `Jwt:Audience`, `Jwt:ExpiryMinutes` | Thông số JWT. Access token mặc định 15 phút (ngắn vì không thu hồi được giữa chừng) |
| `Jwt:RefreshTokenExpiryDays` | Thời hạn refresh token, mặc định 30 ngày. Refresh token lưu trong DB nên thu hồi được (đổi mật khẩu, bị khóa) |
| `Cors:AllowedOrigins` | Danh sách origin của frontend |
| `Booking:BufferDays` | Số ngày đệm (giặt ủi) trước/sau mỗi booking (mặc định 1) |
| `Booking:PendingHoldHours` | Pending quá số giờ này không còn giữ lịch và bị tự hủy (mặc định 24) |
| `Booking:MaxRentalDays` | Số ngày thuê tối đa mỗi đơn |
| `Booking:UtcOffsetHours` | Múi giờ nghiệp vụ để xác định "hôm nay" (VN = 7) |
| `ImageStorage:MaxFileSizeBytes`, `MaxImagesPerProduct` | Giới hạn upload |
| `Database:AutoMigrateAndSeed` | `true` → tự migrate + seed khi khởi động (Development bật sẵn) |
| `Seed:AdminEmail`, `Seed:AdminPassword`, `Seed:StaffEmail`, `Seed:StaffPassword` | Email đăng nhập và mật khẩu tài khoản seed (chỉ dùng khi seed) |

### Production / bí mật

Không đặt secret vào file cấu hình được commit. Dùng biến môi trường (dấu `__` thay cho `:`):

```bash
export Jwt__Key="<chuỗi ngẫu nhiên >= 32 ký tự>"
export ConnectionStrings__DefaultConnection="Server=...;Database=UmeClothing;..."
export Cors__AllowedOrigins__0="https://your-frontend.example.com"
```

Khi dev, cấu hình bí mật cục bộ bằng user-secrets (không được lưu trong repo):

```powershell
cd BE/BE_UmeClothing
dotnet user-secrets set "Jwt:Key" "<chuỗi ngẫu nhiên >= 32 ký tự>"
dotnet user-secrets set "Seed:AdminEmail" "<email-admin>"
dotnet user-secrets set "Seed:AdminPassword" "<mật-khẩu-mạnh>"
dotnet user-secrets set "Seed:StaffEmail" "<email-nhân-viên>"
dotnet user-secrets set "Seed:StaffPassword" "<mật-khẩu-mạnh>"
```

`UserSecretsId` đã được khai báo trong project; các giá trị trên được lưu ngoài thư mục mã nguồn.
Ở production, dùng secret manager của nền tảng hoặc biến môi trường tương ứng (ví dụ `Seed__AdminPassword`).

## 3. Database & Migration

Repo **chưa chứa** thư mục `Migrations/` (không thể sinh migration chính xác nếu không có .NET SDK).
Hãy tạo migration `InitialCreate` một lần:

**Package Manager Console (Visual Studio):**
```
Add-Migration InitialCreate
Update-Database
```

**CLI:**
```bash
dotnet restore
dotnet ef migrations add InitialCreate
dotnet ef database update
```

Ở môi trường Development, nếu đã có migration, ứng dụng tự `Migrate` và seed dữ liệu khi khởi động
(`Database:AutoMigrateAndSeed = true`). Nếu chưa có migration, ứng dụng sẽ báo lỗi rõ ràng.

> **Đổi lớn:** mỗi sản phẩm giờ có nhiều SIZE (`ProductVariant`), mỗi size là 1 món đồ vật lý có lịch riêng.
> `Product.Size` đã bị xóa; `BookingItem` giờ trỏ vào `ProductVariant` thay vì `Product`. Đây là đổi schema phá vỡ
> tương thích. Nếu bạn đã có DB từ trước (kể cả chỉ mới seed demo), cách đơn giản nhất là **xóa migration cũ và
> database, tạo lại từ đầu** (dữ liệu demo không đáng giữ):
> ```bash
> rm -rf Migrations
> # xóa database UmeClothing trong SSMS/Azure Data Studio, hoặc: dotnet ef database drop
> dotnet ef migrations add InitialCreate
> dotnet ef database update
> ```
> Nếu bạn đã có dữ liệu thật muốn giữ, cần viết migration data-transform thủ công (tạo 1 variant "M" cho mỗi
> product hiện có, trỏ BookingItem sang variant đó) — tôi chưa viết vì không biết dữ liệu thật của bạn.

> **Nếu bạn đã tạo `InitialCreate` và có DB từ trước:** schema đã đổi thêm 2 bảng (`RefreshTokens` cho tính năng
> refresh token, `PasswordResetCodes` cho quên mật khẩu). Chạy thêm một migration mới, KHÔNG xóa migration cũ:
> ```bash
> dotnet ef migrations add AddRefreshTokensAndPasswordReset
> dotnet ef database update
> ```

### Seed data

| Tài khoản | Email | Mật khẩu (dev) |
|---|---|---|
| Admin | admin@umeclothing.com | `Admin@123456` |
| Staff | staff@umeclothing.com | `Staff@123456` |

Mật khẩu được hash bằng BCrypt, không lưu plaintext trong DB. Mật khẩu dev nằm trong `appsettings.Development.json`
nên **ai có repo đều biết** – bắt buộc đổi/đặt lại khi triển khai thật.
Seed cũng tạo 5 category (Dress, Suit, Shirt, Skirt, Accessories) và 8 sản phẩm demo (chưa có ảnh).

## 4. Chạy backend

```bash
cd BE_UmeClothing
dotnet run --launch-profile https
```

- API: `https://localhost:7100` (http: `5100`)
- Swagger (chỉ Development): `https://localhost:7100/swagger`
  - Đăng nhập qua `POST /api/auth/login`, copy `data.token`, bấm **Authorize** trong Swagger.
- Lần đầu chạy HTTPS: `dotnet dev-certs https --trust`.

## 5. SignalR

- Endpoint: `/hubs/notifications`
- Token gửi qua query `?access_token=<JWT>` (WebSocket không gửi được header). Ở frontend dùng `accessTokenFactory`.
- Cho phép kết nối ẩn danh (để khách xem sản phẩm nhận availability công khai); chỉ kết nối có JWT mới vào group riêng.
- Groups: `admin`, `staff`, `user_{userId}`.

| Event | Ai nhận | Payload |
|---|---|---|
| `BOOKING_CREATED` | admin, staff | bookingId, bookingCode, customerName, createdAt, status |
| `BOOKING_STATUS_CHANGED` | customer sở hữu đơn + admin + staff | bookingId, bookingCode, oldStatus, newStatus, updatedAt |
| `PRODUCT_AVAILABILITY_CHANGED` | tất cả client đang kết nối | productId, startDate, endDate |
| `DASHBOARD_UPDATED` | admin, staff | totalProducts, totalCustomers, totalBookings, pending/confirmed/renting/returned/completed/cancelled, revenue |

Tên thuộc tính JSON là camelCase, enum là chuỗi (ví dụ `"Pending"`).
Sự kiện chỉ được gửi **sau khi** transaction commit; REST vẫn là nguồn dữ liệu chính.

## 6. Cấu hình lưu trữ ảnh

Database chỉ lưu `Url` và `PublicId`, không lưu binary.

- Mặc định: `LocalImageStorageService` lưu vào `wwwroot/uploads/` (phù hợp dev/demo, single server). `Url` trả về dạng tương đối `/uploads/products/{id}/{guid}.jpg` – frontend ghép với origin của API.
- Validate: tối đa 5MB/ảnh, tối đa 10 ảnh/sản phẩm, chỉ JPEG/PNG/WEBP, kiểm tra magic bytes (không tin Content-Type/tên file).
- Tích hợp Cloudinary / Cloudflare R2: tạo class implement `IImageStorageService` (`UploadAsync`, `DeleteAsync`) rồi thay dòng đăng ký DI trong `Program.cs`:
  ```csharp
  builder.Services.AddSingleton<IImageStorageService, CloudinaryImageStorageService>();
  ```

## 7. Quy tắc nghiệp vụ quan trọng

- **Giá:** `RentalPrice` là giá thuê **theo ngày**. `Subtotal = Σ RentalPrice × số ngày`, `Deposit = Σ DepositPrice`, `Total = Subtotal + Deposit`. Backend tự tính và **snapshot** giá + cọc vào `BookingItem`.
- **Ngày:** `StartDate` inclusive, `EndDate` exclusive (= ngày trả). Số ngày = `EndDate - StartDate`. Dùng `DateOnly`, không có giờ.
- **Mỗi Product là 1 đơn vị duy nhất** (`Quantity` luôn = 1).
- **Giữ lịch:** Confirmed, Renting luôn giữ. Pending giữ tối đa `PendingHoldHours`. Returned/Completed/Cancelled không giữ. Renting quá hạn trả vẫn chặn lịch.
- **Buffer:** mỗi booking chiếm `[Start - BufferDays, End + BufferDays)`.
- **Chống double booking:** transaction + `SELECT ... WITH (UPDLOCK, HOLDLOCK)` trên các hàng `Products` liên quan (khóa theo thứ tự Id) rồi kiểm tra lại availability; nếu trùng → **409 Conflict**. Xác nhận Pending → Confirmed cũng kiểm tra lại dưới lock.
- **Chuyển trạng thái hợp lệ:** Pending → Confirmed | Cancelled; Confirmed → Renting | Cancelled; Renting → Returned; Returned → Completed. Customer chỉ tự hủy được đơn **Pending**.
- **Doanh thu dashboard:** tổng `Subtotal` của booking Completed (không tính tiền cọc hoàn lại).
- Booking Pending quá hạn được job nền quét mỗi `PendingSweepMinutes` phút để tự hủy.

## 8. Quên mật khẩu (OTP qua email)

Đã cân nhắc OTP qua SMS (điện thoại) so với email — chọn **email** vì:
- SMS cần hợp đồng với nhà cung cấp (eSMS, SpeedSMS, Twilio...), tốn phí mỗi tin nhắn, cần đăng ký brandname,
  và cần tài khoản/API key thật để viết + kiểm chứng code — không có sẵn trong môi trường phát triển này.
- Email dùng SMTP/SendGrid/SES đều được, gần như miễn phí, và số điện thoại hiện là trường **tùy chọn** khi
  đăng ký (không phải mọi user đều có).

**Mặc định KHÔNG gửi email thật.** Nếu `Smtp:Host` để trống (mặc định lúc mới clone repo), hệ thống tự dùng
`LoggingEmailSender`: chỉ ghi mã OTP ra log console của backend (`_logger.LogWarning`), không gửi gì cả. Đủ để
phát triển/kiểm thử ngay mà không cần tài khoản email thật.

**Gửi thật:** khai báo `Smtp:Host` (khác rỗng) và hệ thống tự chuyển sang `SmtpEmailSender` — gửi qua SMTP chuẩn
(dùng thư viện MailKit), không khóa cứng vào một nhà cung cấp nào. Đã cân nhắc và chọn **Brevo** làm ví dụ vì có
mức miễn phí vĩnh viễn thực sự (300 email/ngày, không giới hạn thời gian, không cần thẻ tín dụng — kiểm tra lại
giá/hạn mức tại thời điểm bạn đọc README này vì các nhà cung cấp có thể đổi chính sách). SendGrid **không** còn
free vĩnh viễn (chỉ 60 ngày dùng thử tính đến 2026) nên không dùng làm ví dụ mặc định.

Cấu hình mẫu cho Brevo (đặt qua user-secrets hoặc biến môi trường `Smtp__Password`, KHÔNG ghi mật khẩu vào file
commit):
```json
{
  "Smtp": {
    "Host": "smtp-relay.brevo.com",
    "Port": 587,
    "Username": "email-dang-nhap-brevo-cua-ban@example.com",
    "Password": "SMTP-key-tao-trong-Brevo-Dashboard-KHONG-PHAI-mat-khau-dang-nhap",
    "FromEmail": "no-reply@yourdomain.com",
    "FromName": "UmeClothing",
    "UseStartTls": true
  }
}
```
Cùng cấu trúc này dùng được cho Mailgun, Amazon SES, Postmark, hay SMTP nội bộ — chỉ cần đổi Host/Port/Username/
Password theo nhà cung cấp đó.

**Lưu ý deliverability (email không rơi vào Spam):** cần cấu hình SPF/DKIM cho domain gửi (`FromEmail`) trong
DNS theo hướng dẫn của nhà cung cấp — không làm bước này thì email OTP dễ bị nhà cung cấp email của người nhận
(Gmail, Outlook...) đánh dấu spam hoặc chặn hẳn. Đây là bước cấu hình DNS bạn tự làm, ngoài phạm vi code.

**Lỗi gửi bị nuốt có chủ đích:** nếu SMTP cấu hình sai, `SmtpEmailSender` chỉ ghi log Error, KHÔNG báo lỗi cho
người dùng — vì `ForgotPasswordAsync` luôn phải trả về cùng một kết quả để không lộ email nào đã đăng ký. Hệ quả:
sau khi đổi cấu hình Smtp, bạn phải tự kiểm tra log để biết đã đúng chưa (gửi thử `POST /api/auth/forgot-password`
rồi xem log có báo lỗi không), UI sẽ không bao giờ báo lỗi giúp bạn.

Luồng: `POST /api/auth/forgot-password { email }` → nếu email tồn tại và tài khoản đang hoạt động, sinh mã 6 số,
lưu **hash** của mã (không lưu mã gốc) kèm hạn 15 phút, gửi qua `IEmailSender`. Luôn trả về 200 dù email có tồn
tại hay không, để không lộ danh sách email đã đăng ký. `POST /api/auth/reset-password { email, code, newPassword }`
kiểm tra mã, đặt mật khẩu mới, và thu hồi toàn bộ refresh token của user (đăng xuất mọi thiết bị).

Cấu hình ở `PasswordReset` trong `appsettings.json`: `CodeLength` (mặc định 6), `ExpiryMinutes` (15),
`MaxAttempts` (5 — nhập sai quá số này thì mã bị khóa dù chưa hết hạn, chống dò mã bằng brute force).

**Giới hạn đã biết:** yêu cầu mã mới liên tục không bị giới hạn ngoài rate limit chung theo IP (policy `"auth"`,
10 request/phút) — chưa giới hạn riêng theo email/user. `ResetPasswordAsync` có thể có chênh lệch thời gian nhỏ
giữa "email không tồn tại" và "email tồn tại nhưng mã sai" (không áp dụng kỹ thuật "burn time" như ở Login).

## 9. Phân quyền Staff vs Admin

Trước đây Admin và Staff có quyền ngang nhau. Nay tách:

| Thao tác | Admin | Staff |
|---|---|---|
| Tạo/sửa sản phẩm, danh mục | ✓ | ✓ |
| **Xóa** sản phẩm, danh mục | ✓ | ✗ (dùng `Status=Hidden` / `IsActive=false` thay vì xóa) |
| Upload/xóa/sắp xếp ảnh sản phẩm | ✓ | ✓ |
| Xem, xác nhận, đổi trạng thái đơn thuê | ✓ | ✓ |
| Xem danh sách khách hàng | ✓ | ✓ |
| **Khóa/mở khóa** tài khoản khách hàng | ✓ | ✗ |
| Xem dashboard, lịch thuê | ✓ | ✓ |

Lý do: xóa dữ liệu và khóa tài khoản người khác là thao tác khó hoàn tác/ảnh hưởng người khác, nên thu hẹp về Admin.
Việc còn lại (vận hành hàng ngày) vẫn để Staff làm được để không cần Admin can thiệp mọi việc nhỏ.

Đây là **lựa chọn mặc định do Claude chọn**, không phải yêu cầu tường minh ban đầu (đề bài gốc gộp
`[Authorize(Roles = "Admin,Staff")]` cho mọi thao tác quản trị). Nếu không đúng ý bạn, đổi lại bằng cách sửa
`[Authorize(Roles = "Admin")]` thành `[Authorize(Roles = "Admin,Staff")]` ở 3 action: `ProductsController.Delete`,
`CategoriesController.Delete`, `AdminController.SetCustomerStatus`.

**Giới hạn:** đây chỉ là kiểm tra ở tầng controller (thuộc tính `[Authorize(Roles = ...)]`), chưa có test tự động
xác nhận Staff thật sự nhận 403 khi gọi 3 endpoint trên — cần `WebApplicationFactory` (integration test qua HTTP),
chưa làm.

## 10. Danh sách API

Response thống nhất: `{ "success": bool, "message": string, "data": any, "errors": string[] }`.
Mã trạng thái: 200, 201, 400, 401, 403, 404, 409, 429 (rate limit đăng nhập/đăng ký), 500.

| Nhóm | Endpoint |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Categories | `GET /api/categories`, `GET /{id}`, `GET /slug/{slug}`; `POST/PUT/DELETE` (Admin,Staff) |
| Products | `GET /api/products`, `GET /search`, `GET /{id}`, `GET /slug/{slug}`, `GET /{id}/availability`; `POST/PUT/DELETE` (Admin,Staff) |
| Images | `POST /api/products/{id}/images`, `DELETE .../{imageId}`, `PUT .../{imageId}/primary`, `PUT .../order` (Admin,Staff) |
| Bookings | `POST /api/bookings`, `GET /my`, `GET /{id}`, `PUT /{id}/cancel` (Customer) |
| Auth (hồ sơ) | `PUT /api/auth/profile` (đổi họ tên, SĐT — không đổi được email), `PUT /api/auth/password` (cần mật khẩu hiện tại) |
| Auth (phiên) | `POST /api/auth/refresh` (đổi refresh token lấy access token mới, có xoay vòng), `POST /api/auth/logout` (thu hồi refresh token) |
| Auth (quên mật khẩu) | `POST /api/auth/forgot-password` (gửi mã OTP qua email), `POST /api/auth/reset-password` (đặt lại mật khẩu bằng mã) |
| Admin | `GET /api/admin/bookings`, `GET /{id}`, `PUT /{id}/status`, `GET /api/admin/dashboard`, `/customers`, `/calendar?from=&to=&productId=`, `PUT /customers/{id}/status` (khóa/mở khóa khách hàng) |

Query sản phẩm: `search, categoryId, categorySlug, minPrice, maxPrice, size, color, status, startDate, endDate, sort (newest|price_asc|price_desc|name), page, pageSize`.

## 11. Giới hạn đã biết

- **Có refresh token, nhưng vẫn KHÔNG thu hồi được access token (JWT) đang dùng dở.** Đổi mật khẩu hoặc bị khóa
  (`PUT /customers/{id}/status`) sẽ thu hồi toàn bộ refresh token của user, nên họ không lấy được access token
  MỚI nữa — nhưng access token đã phát hành trước đó vẫn còn hiệu lực đến khi hết hạn tự nhiên (tối đa
  `Jwt:ExpiryMinutes`, mặc định 15 phút). Muốn thu hồi tức thì hoàn toàn phải có danh sách JWT bị chặn
  (denylist) kiểm tra ở mỗi request — chưa làm vì tốn thêm một lượt truy vấn DB cho MỌI request có auth.
- Refresh token dùng cơ chế rotation + phát hiện dùng lại (reuse detection): mỗi lần refresh, token cũ bị thu hồi
  và token mới được cấp. Nếu một token đã bị thu hồi lại được dùng (dấu hiệu bị đánh cắp), toàn bộ refresh token
  còn hiệu lực của user đó bị thu hồi ngay — kể cả token hợp lệ mà chủ tài khoản đang giữ, vì hệ thống không phân
  biệt được ai là kẻ tấn công giữa hai bên đang có token. Hệ quả: người dùng phải đăng nhập lại trên mọi thiết bị.
- Đổi email tự phục vụ chưa có (cố ý): cần luồng xác minh email riêng để tránh chiếm đoạt tài khoản qua đổi email.
- Refresh token gửi trong body JSON (không phải cookie HttpOnly), lưu ở `localStorage` phía frontend — đơn giản
  nhưng có rủi ro XSS giống access token. Muốn an toàn hơn cần chuyển sang cookie HttpOnly + SameSite, việc này
  đổi cách gọi API khá nhiều nên chưa làm.
- Token SignalR đi qua query string nên có thể xuất hiện trong access log của reverse proxy – cần cấu hình che/không log query cho `/hubs`.
- Không có API cập nhật hồ sơ (`/profile`), khóa/mở khóa customer, đổi mật khẩu.
- Chưa có unit/integration test.
- Chưa có Cloudinary/R2 thật (chỉ có interface + bản Local).
