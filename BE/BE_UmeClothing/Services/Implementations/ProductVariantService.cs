using BE_UmeClothing.Data;
using BE_UmeClothing.DTOs.Products;
using BE_UmeClothing.Helpers;
using BE_UmeClothing.Mappings;
using BE_UmeClothing.Models;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BE_UmeClothing.Services.Implementations;

public class ProductVariantService : IProductVariantService
{
    private readonly AppDbContext _db;

    public ProductVariantService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ProductVariantDto>> GetByProductAsync(int productId, CancellationToken ct = default)
    {
        await EnsureProductExistsAsync(productId, ct);

        return await _db.ProductVariants.AsNoTracking()
            .Where(v => v.ProductId == productId)
            .OrderBy(v => v.Size)
            .Select(v => v.ToDto())
            .ToListAsync(ct);
    }

    public async Task<ProductVariantDto> CreateAsync(int productId, ProductVariantRequest request, CancellationToken ct = default)
    {
        await EnsureProductExistsAsync(productId, ct);

        var size = request.Size.Trim();
        if (await _db.ProductVariants.AnyAsync(v => v.ProductId == productId && v.Size == size, ct))
            throw new ConflictException($"Sản phẩm đã có size \"{size}\" rồi.");

        var variant = new ProductVariant { ProductId = productId, Size = size, Status = request.Status };
        _db.ProductVariants.Add(variant);
        await _db.SaveChangesAsync(ct);

        return variant.ToDto();
    }

    public async Task<ProductVariantDto> UpdateAsync(int productId, int variantId, ProductVariantRequest request, CancellationToken ct = default)
    {
        var variant = await _db.ProductVariants.FirstOrDefaultAsync(v => v.Id == variantId && v.ProductId == productId, ct)
                      ?? throw new NotFoundException("Không tìm thấy size này của sản phẩm.");

        var size = request.Size.Trim();
        if (size != variant.Size &&
            await _db.ProductVariants.AnyAsync(v => v.ProductId == productId && v.Size == size && v.Id != variantId, ct))
            throw new ConflictException($"Sản phẩm đã có size \"{size}\" rồi.");

        // Đổi tên size KHÔNG ảnh hưởng đơn cũ vì BookingItem đã snapshot Size tại thời điểm đặt.
        variant.Size = size;
        variant.Status = request.Status;
        variant.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return variant.ToDto();
    }

    public async Task DeleteAsync(int productId, int variantId, CancellationToken ct = default)
    {
        var variant = await _db.ProductVariants.FirstOrDefaultAsync(v => v.Id == variantId && v.ProductId == productId, ct)
                      ?? throw new NotFoundException("Không tìm thấy size này của sản phẩm.");

        if (await _db.BookingItems.AnyAsync(i => i.ProductVariantId == variantId, ct))
            throw new ConflictException("Size này đã có lịch sử thuê nên không thể xóa. Hãy chuyển trạng thái sang Hidden.");

        _db.ProductVariants.Remove(variant);
        await _db.SaveChangesAsync(ct);
    }

    private async Task EnsureProductExistsAsync(int productId, CancellationToken ct)
    {
        if (!await _db.Products.AnyAsync(p => p.Id == productId, ct))
            throw new NotFoundException("Không tìm thấy sản phẩm.");
    }
}
