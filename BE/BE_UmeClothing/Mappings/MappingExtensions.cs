using BE_UmeClothing.DTOs.Bookings;
using BE_UmeClothing.DTOs.Products;
using BE_UmeClothing.DTOs.Users;
using BE_UmeClothing.Models;

namespace BE_UmeClothing.Mappings;

public static class MappingExtensions
{
    public static UserDto ToDto(this User u) =>
        new(u.Id, u.FullName, u.Email, u.Phone, u.Role, u.IsActive, u.CreatedAt);

    public static ProductImageDto ToDto(this ProductImage i) =>
        new(i.Id, i.Url, i.SortOrder, i.IsPrimary);

    public static ProductVariantDto ToDto(this ProductVariant v) =>
        new(v.Id, v.ProductId, v.Size, v.Status, v.CreatedAt, v.UpdatedAt);

    public static ProductDto ToDto(this Product p) =>
        new(p.Id, p.CategoryId, p.Category?.Name ?? string.Empty, p.Category?.Slug ?? string.Empty,
            p.Name, p.Slug, p.Description, p.RentalPrice, p.DepositPrice, p.Color,
            p.Status, p.CreatedAt, p.UpdatedAt,
            p.Images.OrderBy(i => i.SortOrder).Select(i => i.ToDto()).ToList(),
            p.Variants.OrderBy(v => v.Size).Select(v => v.ToDto()).ToList());

    public static string? PrimaryImageUrl(this Product p) =>
        p.Images.OrderByDescending(i => i.IsPrimary).ThenBy(i => i.SortOrder).FirstOrDefault()?.Url;

    public static BookingItemDto ToDto(this BookingItem i) =>
        new(i.Id, i.ProductVariantId, i.ProductVariant?.ProductId ?? 0,
            i.ProductVariant?.Product?.Name ?? string.Empty, i.ProductVariant?.Product?.Slug ?? string.Empty,
            i.Size, i.ProductVariant?.Product?.PrimaryImageUrl(), i.RentalPrice, i.DepositPrice, i.Quantity,
            i.StartDate, i.EndDate, i.EndDate.DayNumber - i.StartDate.DayNumber, i.Note);

    public static BookingDto ToDto(this Booking b) =>
        new(b.Id, b.BookingCode, b.StartDate, b.EndDate, b.Status, b.Subtotal, b.Deposit, b.Total,
            b.CustomerNote, b.CreatedAt, b.UpdatedAt, b.Items.Select(i => i.ToDto()).ToList());

    public static AdminBookingDto ToAdminDto(this Booking b) =>
        new(b.Id, b.BookingCode, b.CustomerId, b.Customer?.FullName ?? string.Empty,
            b.Customer?.Email ?? string.Empty, b.Customer?.Phone,
            b.StartDate, b.EndDate, b.Status, b.Subtotal, b.Deposit, b.Total,
            b.CustomerNote, b.AdminNote, b.CreatedAt, b.UpdatedAt,
            b.Items.Select(i => i.ToDto()).ToList());
}
