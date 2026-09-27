using BE_UmeClothing.DTOs.Products;

namespace BE_UmeClothing.Services.Interfaces;

public interface IProductVariantService
{
    Task<List<ProductVariantDto>> GetByProductAsync(int productId, CancellationToken ct = default);
    Task<ProductVariantDto> CreateAsync(int productId, ProductVariantRequest request, CancellationToken ct = default);
    Task<ProductVariantDto> UpdateAsync(int productId, int variantId, ProductVariantRequest request, CancellationToken ct = default);
    Task DeleteAsync(int productId, int variantId, CancellationToken ct = default);
}
