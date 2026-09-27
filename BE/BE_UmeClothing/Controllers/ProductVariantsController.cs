using BE_UmeClothing.DTOs.Common;
using BE_UmeClothing.DTOs.Products;
using BE_UmeClothing.Helpers;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BE_UmeClothing.Controllers;

[Route("api/products/{productId:int}/variants")]
public class ProductVariantsController : ApiControllerBase
{
    private readonly IProductVariantService _variants;
    private readonly IAvailabilityService _availability;
    private readonly BookingOptions _bookingOptions;

    public ProductVariantsController(IProductVariantService variants, IAvailabilityService availability, IOptions<BookingOptions> bookingOptions)
    {
        _variants = variants;
        _availability = availability;
        _bookingOptions = bookingOptions.Value;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(int productId, CancellationToken ct) =>
        Success(await _variants.GetByProductAsync(productId, ct));

    /// <summary>
    /// Lịch của MỘT size cụ thể — không phải của cả sản phẩm. Không truyền ngày: chỉ trả BlockedRanges (vẽ lịch).
    /// Truyền cả startDate và endDate: trả thêm IsAvailable + Conflicts. Không lộ thông tin khách hàng.
    /// </summary>
    [HttpGet("{variantId:int}/availability")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvailability(
        int productId, int variantId, [FromQuery] DateOnly? startDate, [FromQuery] DateOnly? endDate, CancellationToken ct)
    {
        if (startDate.HasValue != endDate.HasValue)
            throw new BadRequestException("Cần truyền cả startDate và endDate, hoặc không truyền ngày nào.");

        var variants = await _variants.GetByProductAsync(productId, ct);
        var variant = variants.FirstOrDefault(v => v.Id == variantId)
                      ?? throw new NotFoundException("Không tìm thấy size này của sản phẩm.");

        bool? isAvailable = null;
        string? reason = null;
        var conflicts = new List<DateRangeDto>();

        if (startDate.HasValue && endDate.HasValue)
        {
            var result = await _availability.CheckAvailabilityAsync(variantId, startDate.Value, endDate.Value, null, ct);
            isAvailable = result.IsAvailable;
            reason = result.Reason;
            conflicts = result.Conflicts;
        }

        var blocked = await _availability.GetBlockedRangesAsync(variantId, _bookingOptions.Today(), ct);

        return Success(new VariantAvailabilityDto(productId, variantId, variant.Size, startDate, endDate, isAvailable, reason, conflicts, blocked));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Create(int productId, [FromBody] ProductVariantRequest request, CancellationToken ct) =>
        CreatedSuccess(await _variants.CreateAsync(productId, request, ct), "Đã thêm size.");

    [HttpPut("{variantId:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update(int productId, int variantId, [FromBody] ProductVariantRequest request, CancellationToken ct) =>
        Success(await _variants.UpdateAsync(productId, variantId, request, ct), "Đã cập nhật size.");

    /// <summary>Chỉ Admin: xóa là thao tác không thể hoàn tác.</summary>
    [HttpDelete("{variantId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int productId, int variantId, CancellationToken ct)
    {
        await _variants.DeleteAsync(productId, variantId, ct);
        return Success<object?>(null, "Đã xóa size.");
    }
}
