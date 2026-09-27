using BE_UmeClothing.Data;
using BE_UmeClothing.DTOs.Common;
using BE_UmeClothing.DTOs.Products;
using BE_UmeClothing.Helpers;
using BE_UmeClothing.Mappings;
using BE_UmeClothing.Models;
using BE_UmeClothing.Models.Enums;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BE_UmeClothing.Services.Implementations;

public class ProductService : IProductService
{
    private readonly AppDbContext _db;
    private readonly IAvailabilityService _availability;
    private readonly IImageStorageService _storage;
    private readonly ILogger<ProductService> _logger;

    public ProductService(AppDbContext db, IAvailabilityService availability, IImageStorageService storage, ILogger<ProductService> logger)
    {
        _db = db;
        _availability = availability;
        _storage = storage;
        _logger = logger;
    }

    public async Task<PagedResult<ProductDto>> GetPagedAsync(ProductQuery q, bool includeHidden, CancellationToken ct = default)
    {
        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize, 1, 50);

        var query = _db.Products.AsNoTracking().Include(p => p.Category).Include(p => p.Images).Include(p => p.Variants).AsQueryable();

        if (!includeHidden)
            query = query.Where(p => p.Status != ProductStatus.Hidden);

        if (q.Status.HasValue && (includeHidden || q.Status.Value != ProductStatus.Hidden))
            query = query.Where(p => p.Status == q.Status.Value);

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(p => p.Name.Contains(s) || (p.Description != null && p.Description.Contains(s)));
        }

        if (q.CategoryId.HasValue)
            query = query.Where(p => p.CategoryId == q.CategoryId.Value);

        if (!string.IsNullOrWhiteSpace(q.CategorySlug))
        {
            var slug = q.CategorySlug.Trim();
            query = query.Where(p => p.Category.Slug == slug);
        }

        if (q.MinPrice.HasValue)
            query = query.Where(p => p.RentalPrice >= q.MinPrice.Value);
        if (q.MaxPrice.HasValue)
            query = query.Where(p => p.RentalPrice <= q.MaxPrice.Value);

        // "Có ít nhất một size khớp" — không quan tâm size đó còn trống hay không (đó là việc của bộ lọc ngày).
        if (!string.IsNullOrWhiteSpace(q.Size))
        {
            var size = q.Size.Trim();
            query = query.Where(p => p.Variants.Any(v => v.Size == size));
        }

        if (!string.IsNullOrWhiteSpace(q.Color))
        {
            var color = q.Color.Trim();
            query = query.Where(p => p.Color == color);
        }

        if (q.StartDate.HasValue && q.EndDate.HasValue)
        {
            if (q.EndDate.Value <= q.StartDate.Value)
                throw new BadRequestException("Ngày trả phải sau ngày bắt đầu.");

            // "Còn ít nhất 1 size trống" — khách chọn size cụ thể sau, ở trang chi tiết.
            var availableProductIds = await _availability.GetAvailableProductIdsAsync(q.StartDate.Value, q.EndDate.Value, ct);
            query = query.Where(p => availableProductIds.Contains(p.Id));
        }

        var total = await query.CountAsync(ct);

        query = ApplySort(query, q.Sort);

        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new PagedResult<ProductDto>(items.Select(p => p.ToDto()).ToList(), page, pageSize, total);
    }

    public async Task<ProductDto> GetByIdAsync(int id, bool includeHidden, CancellationToken ct = default)
    {
        var product = await _db.Products.AsNoTracking()
            .Include(p => p.Category).Include(p => p.Images).Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == id && (includeHidden || p.Status != ProductStatus.Hidden), ct)
            ?? throw new NotFoundException("Không tìm thấy sản phẩm.");

        return product.ToDto();
    }

    public async Task<ProductDto> GetBySlugAsync(string slug, bool includeHidden, CancellationToken ct = default)
    {
        var product = await _db.Products.AsNoTracking()
            .Include(p => p.Category).Include(p => p.Images).Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Slug == slug && (includeHidden || p.Status != ProductStatus.Hidden), ct)
            ?? throw new NotFoundException("Không tìm thấy sản phẩm.");

        return product.ToDto();
    }

    public async Task<ProductDto> CreateAsync(ProductRequest request, CancellationToken ct = default)
    {
        await EnsureCategoryExistsAsync(request.CategoryId, ct);

        var product = new Product
        {
            CategoryId = request.CategoryId,
            Name = request.Name.Trim(),
            Slug = await UniqueSlugAsync(string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug, null, ct),
            Description = request.Description?.Trim(),
            RentalPrice = request.RentalPrice,
            DepositPrice = request.DepositPrice,
            Color = request.Color.Trim(),
            Status = request.Status
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(product.Id, true, ct);
    }

    public async Task<ProductDto> UpdateAsync(int id, ProductRequest request, CancellationToken ct = default)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, ct)
                      ?? throw new NotFoundException("Không tìm thấy sản phẩm.");

        if (product.CategoryId != request.CategoryId)
            await EnsureCategoryExistsAsync(request.CategoryId, ct);

        product.CategoryId = request.CategoryId;
        product.Name = request.Name.Trim();
        product.Description = request.Description?.Trim();
        product.RentalPrice = request.RentalPrice;
        product.DepositPrice = request.DepositPrice;
        product.Color = request.Color.Trim();
        product.Status = request.Status;

        // Đổi giá KHÔNG ảnh hưởng booking cũ vì BookingItem đã snapshot giá.
        if (!string.IsNullOrWhiteSpace(request.Slug) && SlugHelper.Generate(request.Slug, 100) != product.Slug)
            product.Slug = await UniqueSlugAsync(request.Slug, id, ct);

        product.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, true, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var product = await _db.Products.Include(p => p.Images).Include(p => p.Variants).FirstOrDefaultAsync(p => p.Id == id, ct)
                      ?? throw new NotFoundException("Không tìm thấy sản phẩm.");

        var variantIds = product.Variants.Select(v => v.Id).ToList();
        if (variantIds.Count > 0 && await _db.BookingItems.AnyAsync(i => variantIds.Contains(i.ProductVariantId), ct))
            throw new ConflictException("Sản phẩm đã có lịch sử thuê nên không thể xóa. Hãy chuyển trạng thái sang Hidden.");

        var publicIds = product.Images.Select(i => i.PublicId).ToList();

        // Xóa variant trước (không cascade) rồi mới xóa product.
        _db.ProductVariants.RemoveRange(product.Variants);
        _db.Products.Remove(product);
        await _db.SaveChangesAsync(ct);

        foreach (var publicId in publicIds)
        {
            try
            {
                await _storage.DeleteAsync(publicId, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not delete image {PublicId} after product deletion", publicId);
            }
        }
    }

    private static IQueryable<Product> ApplySort(IQueryable<Product> query, string? sort) =>
        sort?.Trim().ToLowerInvariant() switch
        {
            "price_asc" => query.OrderBy(p => p.RentalPrice).ThenBy(p => p.Id),
            "price_desc" => query.OrderByDescending(p => p.RentalPrice).ThenBy(p => p.Id),
            "name" => query.OrderBy(p => p.Name).ThenBy(p => p.Id),
            _ => query.OrderByDescending(p => p.CreatedAt).ThenBy(p => p.Id)
        };

    private async Task EnsureCategoryExistsAsync(int categoryId, CancellationToken ct)
    {
        if (!await _db.Categories.AnyAsync(c => c.Id == categoryId, ct))
            throw new BadRequestException("Danh mục không tồn tại.");
    }

    private async Task<string> UniqueSlugAsync(string source, int? excludeId, CancellationToken ct)
    {
        var baseSlug = SlugHelper.Generate(source, 190);
        var slug = baseSlug;
        var i = 2;

        while (await _db.Products.AnyAsync(p => p.Slug == slug && (excludeId == null || p.Id != excludeId), ct))
            slug = $"{baseSlug}-{i++}";

        return slug;
    }
}
