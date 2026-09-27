using System.Data;
using System.Security.Cryptography;
using BE_UmeClothing.Data;
using BE_UmeClothing.DTOs.Bookings;
using BE_UmeClothing.DTOs.Common;
using BE_UmeClothing.DTOs.Realtime;
using BE_UmeClothing.Helpers;
using BE_UmeClothing.Mappings;
using BE_UmeClothing.Models;
using BE_UmeClothing.Models.Enums;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BE_UmeClothing.Services.Implementations;

public class BookingService : IBookingService
{
    private static readonly IReadOnlyDictionary<BookingStatus, BookingStatus[]> Transitions =
        new Dictionary<BookingStatus, BookingStatus[]>
        {
            [BookingStatus.Pending] = new[] { BookingStatus.Confirmed, BookingStatus.Cancelled },
            [BookingStatus.Confirmed] = new[] { BookingStatus.Renting, BookingStatus.Cancelled },
            [BookingStatus.Renting] = new[] { BookingStatus.Returned },
            [BookingStatus.Returned] = new[] { BookingStatus.Completed },
            [BookingStatus.Cancelled] = Array.Empty<BookingStatus>(),
            [BookingStatus.Completed] = Array.Empty<BookingStatus>()
        };

    private readonly AppDbContext _db;
    private readonly IAvailabilityService _availability;
    private readonly IRealtimeNotifier _notifier;
    private readonly IAdminService _admin;
    private readonly BookingOptions _opt;
    private readonly ILogger<BookingService> _logger;

    public BookingService(
        AppDbContext db,
        IAvailabilityService availability,
        IRealtimeNotifier notifier,
        IAdminService admin,
        IOptions<BookingOptions> options,
        ILogger<BookingService> logger)
    {
        _db = db;
        _availability = availability;
        _notifier = notifier;
        _admin = admin;
        _opt = options.Value;
        _logger = logger;
    }

    // ------------------------------------------------------------------
    // CREATE: transaction + khóa hàng ProductVariant (UPDLOCK, HOLDLOCK) + kiểm tra lại availability
    // ------------------------------------------------------------------
    public async Task<BookingDto> CreateAsync(int customerId, CreateBookingRequest request, CancellationToken ct = default)
    {
        // 1. Validate request
        var today = _opt.Today();
        ValidateDates(request.StartDate, request.EndDate, today);

        if (request.Items.Count > _opt.MaxItemsPerBooking)
            throw new BadRequestException($"Mỗi đơn tối đa {_opt.MaxItemsPerBooking} sản phẩm.");

        var variantIds = request.Items.Select(i => i.VariantId).ToList();
        if (variantIds.Distinct().Count() != variantIds.Count)
            throw new BadRequestException("Sản phẩm/size bị trùng trong đơn.");

        var customer = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == customerId && u.IsActive, ct)
                       ?? throw new UnauthorizedException("Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa.");

        int bookingId;

        // 2. Begin transaction
        await using (var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct))
        {
            // 3-4. Khóa các hàng ProductVariant (theo thứ tự Id tăng dần để tránh deadlock).
            //      Người đến sau sẽ chờ đến khi giao dịch trước commit/rollback rồi mới kiểm tra availability.
            await LockVariantsAsync(variantIds, ct);

            var variants = await _db.ProductVariants.Include(v => v.Product)
                .Where(v => variantIds.Contains(v.Id)).ToListAsync(ct);
            if (variants.Count != variantIds.Count)
                throw new NotFoundException("Có sản phẩm/size không tồn tại.");

            var notBookable = variants
                .Where(v => v.Product.Status != ProductStatus.Available || v.Status != ProductStatus.Available)
                .Select(v => $"{v.Product.Name} (size {v.Size})")
                .ToList();
            if (notBookable.Count > 0)
                throw new BadRequestException("Có sản phẩm/size hiện không nhận đặt thuê.", notBookable);

            // 5. Kiểm tra availability trên backend (đã nằm trong lock)
            var blockedIds = await _availability.GetBlockedVariantIdsAsync(request.StartDate, request.EndDate, variantIds, null, ct);
            if (blockedIds.Count > 0)
            {
                var names = variants.Where(v => blockedIds.Contains(v.Id)).Select(v => $"{v.Product.Name} (size {v.Size})").ToList();
                throw new ConflictException("Có sản phẩm/size đã được đặt trong khoảng thời gian này.", names);
            }

            // 6. Tạo Booking + BookingItems. Backend tự tính tiền từ giá hiện tại và snapshot vào item.
            var days = request.EndDate.DayNumber - request.StartDate.DayNumber;
            var itemNotes = request.Items.ToDictionary(i => i.VariantId, i => string.IsNullOrWhiteSpace(i.Note) ? null : i.Note.Trim());

            var booking = new Booking
            {
                BookingCode = await GenerateCodeAsync(ct),
                CustomerId = customerId,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Status = BookingStatus.Pending,
                CustomerNote = string.IsNullOrWhiteSpace(request.CustomerNote) ? null : request.CustomerNote.Trim()
            };

            foreach (var v in variants)
            {
                booking.Items.Add(new BookingItem
                {
                    ProductVariantId = v.Id,
                    Size = v.Size,
                    RentalPrice = v.Product.RentalPrice,
                    DepositPrice = v.Product.DepositPrice,
                    Quantity = 1,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    Note = itemNotes[v.Id]
                });
            }

            booking.Subtotal = booking.Items.Sum(i => i.RentalPrice * i.Quantity * days);
            booking.Deposit = booking.Items.Sum(i => i.DepositPrice * i.Quantity);
            booking.Total = booking.Subtotal + booking.Deposit;

            _db.Bookings.Add(booking);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            bookingId = booking.Id;
        }

        // 7. Chỉ gửi SignalR SAU KHI commit thành công.
        var created = await Detailed().AsNoTracking().FirstAsync(b => b.Id == bookingId, ct);

        try
        {
            await _notifier.BookingCreatedAsync(new BookingCreatedEvent(
                created.Id, created.BookingCode, customer.FullName, created.CreatedAt, created.Status));
            await _notifier.ProductAvailabilityChangedAsync(AvailabilityEvents(created));
            await _notifier.DashboardUpdatedAsync(await _admin.GetDashboardStatsAsync());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Realtime publish failed after booking {BookingCode} was created", created.BookingCode);
        }

        return created.ToDto();
    }

    // ------------------------------------------------------------------
    // CUSTOMER QUERIES
    // ------------------------------------------------------------------
    public async Task<PagedResult<BookingDto>> GetMyAsync(int customerId, MyBookingQuery query, CancellationToken ct = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 50);

        var q = Detailed().AsNoTracking().Where(b => b.CustomerId == customerId);
        if (query.Status.HasValue)
            q = q.Where(b => b.Status == query.Status.Value);

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(b => b.CreatedAt).ThenByDescending(b => b.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new PagedResult<BookingDto>(items.Select(b => b.ToDto()).ToList(), page, pageSize, total);
    }

    public async Task<BookingDto> GetForUserAsync(int userId, bool isStaff, int bookingId, CancellationToken ct = default)
    {
        var booking = await Detailed().AsNoTracking().FirstOrDefaultAsync(b => b.Id == bookingId, ct);

        // Trả 404 (không phải 403) khi không phải chủ đơn để không lộ việc đơn có tồn tại.
        if (booking is null || (!isStaff && booking.CustomerId != userId))
            throw new NotFoundException("Không tìm thấy đơn thuê.");

        return booking.ToDto();
    }

    public async Task<BookingDto> CancelAsync(int customerId, int bookingId, CancellationToken ct = default)
    {
        var booking = await Detailed().FirstOrDefaultAsync(b => b.Id == bookingId && b.CustomerId == customerId, ct)
                      ?? throw new NotFoundException("Không tìm thấy đơn thuê.");

        if (booking.Status != BookingStatus.Pending)
            throw new BadRequestException("Chỉ có thể tự hủy đơn đang chờ xác nhận. Với đơn đã xác nhận, vui lòng liên hệ cửa hàng.");

        var old = booking.Status;
        booking.Status = BookingStatus.Cancelled;
        booking.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("Đơn vừa được cập nhật bởi người khác. Vui lòng tải lại và thử lại.");
        }

        await PublishChangeAsync(booking, old, publishAvailability: true);
        return booking.ToDto();
    }

    // ------------------------------------------------------------------
    // ADMIN / STAFF
    // ------------------------------------------------------------------
    public async Task<PagedResult<AdminBookingDto>> GetAdminListAsync(AdminBookingQuery query, CancellationToken ct = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var q = Detailed().AsNoTracking().AsQueryable();

        if (query.Status.HasValue)
            q = q.Where(b => b.Status == query.Status.Value);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(b => b.BookingCode.Contains(s)
                             || b.Customer.FullName.Contains(s)
                             || b.Customer.Email.Contains(s)
                             || (b.Customer.Phone != null && b.Customer.Phone.Contains(s)));
        }

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(b => b.CreatedAt).ThenByDescending(b => b.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new PagedResult<AdminBookingDto>(items.Select(b => b.ToAdminDto()).ToList(), page, pageSize, total);
    }

    public async Task<AdminBookingDto> GetAdminAsync(int bookingId, CancellationToken ct = default)
    {
        var booking = await Detailed().AsNoTracking().FirstOrDefaultAsync(b => b.Id == bookingId, ct)
                      ?? throw new NotFoundException("Không tìm thấy đơn thuê.");
        return booking.ToAdminDto();
    }

    public async Task<AdminBookingDto> UpdateStatusAsync(int bookingId, UpdateBookingStatusRequest request, CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);

        var booking = await Detailed().FirstOrDefaultAsync(b => b.Id == bookingId, ct)
                      ?? throw new NotFoundException("Không tìm thấy đơn thuê.");

        var old = booking.Status;

        if (!Transitions[old].Contains(request.Status))
            throw new BadRequestException($"Không thể chuyển trạng thái từ {old} sang {request.Status}.");

        // Pending -> Confirmed: kiểm tra lại availability dưới lock. Cần thiết vì Pending quá hạn giữ lịch
        // có thể đã bị người khác đặt trùng trước khi job dọn dẹp kịp hủy.
        if (old == BookingStatus.Pending && request.Status == BookingStatus.Confirmed)
        {
            var variantIds = booking.Items.Select(i => i.ProductVariantId).ToList();
            await LockVariantsAsync(variantIds, ct);

            var blocked = await _availability.GetBlockedVariantIdsAsync(booking.StartDate, booking.EndDate, variantIds, booking.Id, ct);
            if (blocked.Count > 0)
            {
                var names = booking.Items.Where(i => blocked.Contains(i.ProductVariantId))
                    .Select(i => $"{i.ProductVariant.Product.Name} (size {i.Size})").ToList();
                throw new ConflictException(
                    "Không thể xác nhận: sản phẩm/size đã được đặt bởi đơn khác trong khoảng thời gian này (đơn có thể đã quá hạn giữ lịch).",
                    names);
            }
        }

        booking.Status = request.Status;
        booking.UpdatedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.AdminNote))
            booking.AdminNote = request.AdminNote.Trim();

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("Đơn vừa được cập nhật bởi người khác. Vui lòng tải lại và thử lại.");
        }

        await tx.CommitAsync(ct);

        await PublishChangeAsync(booking, old, publishAvailability: true);
        return booking.ToAdminDto();
    }

    public async Task<int> ExpirePendingAsync(CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddHours(-_opt.PendingHoldHours);

        var expired = await _db.Bookings.Include(b => b.Items)
            .Where(b => b.Status == BookingStatus.Pending && b.CreatedAt < cutoff)
            .OrderBy(b => b.Id)
            .Take(200)
            .ToListAsync(ct);

        if (expired.Count == 0)
            return 0;

        var now = DateTime.UtcNow;
        foreach (var b in expired)
        {
            b.Status = BookingStatus.Cancelled;
            b.UpdatedAt = now;
            b.AdminNote = "Tự động hủy do quá hạn chờ xác nhận.";
        }

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Có đơn vừa được xử lý thủ công; lượt quét sau sẽ thử lại.
            _logger.LogInformation("Pending expiry sweep hit a concurrency conflict; will retry on next run.");
            return 0;
        }

        // Availability đã được giải phóng từ lúc quá hạn nên không cần phát lại sự kiện availability.
        foreach (var b in expired)
            await PublishChangeAsync(b, BookingStatus.Pending, publishAvailability: false);

        _logger.LogInformation("Auto-cancelled {Count} expired pending bookings", expired.Count);
        return expired.Count;
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------
    private IQueryable<Booking> Detailed() =>
        _db.Bookings
            .Include(b => b.Customer)
            .Include(b => b.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product).ThenInclude(p => p.Images)
            .AsSplitQuery();

    /// <summary>
    /// Khóa các hàng ProductVariant bằng UPDLOCK/HOLDLOCK (SQL Server) — đây là đơn vị thực sự bị tranh chấp
    /// khi đặt thuê, không phải Product. Để virtual để test với SQLite có thể thay bằng no-op;
    /// test tương tranh thật chạy với SQL Server (xem BE_UmeClothing.Tests).
    /// </summary>
    protected virtual async Task LockVariantsAsync(IEnumerable<int> variantIds, CancellationToken ct)
    {
        foreach (var id in variantIds.Distinct().OrderBy(x => x))
        {
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT Id FROM ProductVariants WITH (UPDLOCK, HOLDLOCK) WHERE Id = {id}", ct);
        }
    }

    private void ValidateDates(DateOnly start, DateOnly end, DateOnly today)
    {
        if (start < today)
            throw new BadRequestException("Ngày bắt đầu không được ở quá khứ.");
        if (end <= start)
            throw new BadRequestException("Ngày trả phải sau ngày bắt đầu.");
        if (end.DayNumber - start.DayNumber > _opt.MaxRentalDays)
            throw new BadRequestException($"Thời gian thuê tối đa {_opt.MaxRentalDays} ngày.");
        if (start > today.AddYears(1))
            throw new BadRequestException("Chỉ nhận đặt trước tối đa 1 năm.");
    }

    private async Task<string> GenerateCodeAsync(CancellationToken ct)
    {
        while (true)
        {
            var code = $"UME-{DateTime.UtcNow:yyyyMMdd}-{Convert.ToHexString(RandomNumberGenerator.GetBytes(3))}";
            if (!await _db.Bookings.AnyAsync(b => b.BookingCode == code, ct))
                return code;
        }
    }

    private static IEnumerable<ProductAvailabilityChangedEvent> AvailabilityEvents(Booking b) =>
        b.Items.Select(i => new ProductAvailabilityChangedEvent(i.ProductVariant.ProductId, i.ProductVariantId, i.StartDate, i.EndDate)).ToList();

    private async Task PublishChangeAsync(Booking b, BookingStatus oldStatus, bool publishAvailability)
    {
        try
        {
            await _notifier.BookingStatusChangedAsync(
                b.CustomerId,
                new BookingStatusChangedEvent(b.Id, b.BookingCode, oldStatus, b.Status, b.UpdatedAt));

            if (publishAvailability)
                await _notifier.ProductAvailabilityChangedAsync(AvailabilityEvents(b));

            await _notifier.DashboardUpdatedAsync(await _admin.GetDashboardStatsAsync());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Realtime publish failed for booking {BookingCode}", b.BookingCode);
        }
    }
}
