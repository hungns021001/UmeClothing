using BE_UmeClothing.DTOs.Bookings;
using BE_UmeClothing.DTOs.Common;

namespace BE_UmeClothing.Services.Interfaces;

public interface IBookingService
{
    Task<BookingDto> CreateAsync(int customerId, CreateBookingRequest request, CancellationToken ct = default);

    /// <summary>Đặt thuê không cần tài khoản (guest checkout).</summary>
    Task<BookingDto> CreateGuestAsync(CreateGuestBookingRequest request, CancellationToken ct = default);

    Task<PagedResult<BookingDto>> GetMyAsync(int customerId, MyBookingQuery query, CancellationToken ct = default);
    Task<BookingDto> GetForUserAsync(int userId, bool isStaff, int bookingId, CancellationToken ct = default);
    Task<BookingDto> CancelAsync(int customerId, int bookingId, CancellationToken ct = default);

    /// <summary>Tra cứu đơn của khách vãng lai bằng Mã đơn + SĐT (cả hai phải khớp). Ném NotFoundException nếu sai.</summary>
    Task<BookingDto> LookupGuestAsync(BookingLookupRequest request, CancellationToken ct = default);

    /// <summary>Khách vãng lai tự hủy đơn (chỉ khi đang Pending), xác thực bằng Mã đơn + SĐT.</summary>
    Task<BookingDto> CancelGuestAsync(BookingLookupRequest request, CancellationToken ct = default);

    Task<PagedResult<AdminBookingDto>> GetAdminListAsync(AdminBookingQuery query, CancellationToken ct = default);
    Task<AdminBookingDto> GetAdminAsync(int bookingId, CancellationToken ct = default);
    Task<AdminBookingDto> UpdateStatusAsync(int bookingId, UpdateBookingStatusRequest request, CancellationToken ct = default);

    /// <summary>Tự hủy các booking Pending quá hạn giữ lịch. Trả về số booking đã hủy.</summary>
    Task<int> ExpirePendingAsync(CancellationToken ct = default);
}
