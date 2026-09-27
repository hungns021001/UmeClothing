using System.Linq.Expressions;
using BE_UmeClothing.Data;
using BE_UmeClothing.DTOs.Categories;
using BE_UmeClothing.Helpers;
using BE_UmeClothing.Models;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BE_UmeClothing.Services.Implementations;

public class CategoryService : ICategoryService
{
    private static readonly Expression<Func<Category, CategoryDto>> Projection = c =>
        new CategoryDto(c.Id, c.Name, c.Slug, c.Description, c.IsActive, c.Products.Count, c.CreatedAt, c.UpdatedAt);

    private readonly AppDbContext _db;

    public CategoryService(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<CategoryDto>> GetAllAsync(bool includeInactive, CancellationToken ct = default) =>
        _db.Categories.AsNoTracking()
            .Where(c => includeInactive || c.IsActive)
            .OrderBy(c => c.Name)
            .Select(Projection)
            .ToListAsync(ct);

    public async Task<CategoryDto> GetByIdAsync(int id, bool includeInactive, CancellationToken ct = default) =>
        await _db.Categories.AsNoTracking()
            .Where(c => c.Id == id && (includeInactive || c.IsActive))
            .Select(Projection)
            .FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Không tìm thấy danh mục.");

    public async Task<CategoryDto> GetBySlugAsync(string slug, bool includeInactive, CancellationToken ct = default) =>
        await _db.Categories.AsNoTracking()
            .Where(c => c.Slug == slug && (includeInactive || c.IsActive))
            .Select(Projection)
            .FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Không tìm thấy danh mục.");

    public async Task<CategoryDto> CreateAsync(CategoryRequest request, CancellationToken ct = default)
    {
        var slug = await UniqueSlugAsync(string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug, null, ct);

        var category = new Category
        {
            Name = request.Name.Trim(),
            Slug = slug,
            Description = request.Description?.Trim(),
            IsActive = request.IsActive
        };

        _db.Categories.Add(category);
        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(category.Id, true, ct);
    }

    public async Task<CategoryDto> UpdateAsync(int id, CategoryRequest request, CancellationToken ct = default)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct)
                       ?? throw new NotFoundException("Không tìm thấy danh mục.");

        category.Name = request.Name.Trim();
        category.Description = request.Description?.Trim();
        category.IsActive = request.IsActive;

        // Chỉ đổi slug khi client chủ động gửi slug khác (tránh vỡ URL cũ).
        if (!string.IsNullOrWhiteSpace(request.Slug) && SlugHelper.Generate(request.Slug, 100) != category.Slug)
            category.Slug = await UniqueSlugAsync(request.Slug, id, ct);

        category.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, true, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct)
                       ?? throw new NotFoundException("Không tìm thấy danh mục.");

        if (await _db.Products.AnyAsync(p => p.CategoryId == id, ct))
            throw new ConflictException("Danh mục đang có sản phẩm nên không thể xóa. Hãy chuyển sản phẩm sang danh mục khác hoặc tắt IsActive.");

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync(ct);
    }

    private async Task<string> UniqueSlugAsync(string source, int? excludeId, CancellationToken ct)
    {
        var baseSlug = SlugHelper.Generate(source, 100);
        var slug = baseSlug;
        var i = 2;

        while (await _db.Categories.AnyAsync(c => c.Slug == slug && (excludeId == null || c.Id != excludeId), ct))
            slug = $"{baseSlug}-{i++}";

        return slug;
    }
}
