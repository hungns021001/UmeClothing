using BE_UmeClothing.DTOs.Common;
using BE_UmeClothing.DTOs.Products;

namespace BE_UmeClothing.Services.Interfaces;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetPagedAsync(ProductQuery query, bool includeHidden, CancellationToken ct = default);
    Task<ProductDto> GetByIdAsync(int id, bool includeHidden, CancellationToken ct = default);
    Task<ProductDto> GetBySlugAsync(string slug, bool includeHidden, CancellationToken ct = default);
    Task<ProductDto> CreateAsync(ProductRequest request, CancellationToken ct = default);
    Task<ProductDto> UpdateAsync(int id, ProductRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}
