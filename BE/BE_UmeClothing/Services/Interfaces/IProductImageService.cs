using BE_UmeClothing.DTOs.Products;

namespace BE_UmeClothing.Services.Interfaces;

public interface IProductImageService
{
    Task<List<ProductImageDto>> UploadAsync(int productId, IReadOnlyList<IFormFile> files, CancellationToken ct = default);
    Task<List<ProductImageDto>> DeleteAsync(int productId, int imageId, CancellationToken ct = default);
    Task<List<ProductImageDto>> SetPrimaryAsync(int productId, int imageId, CancellationToken ct = default);
    Task<List<ProductImageDto>> ReorderAsync(int productId, IReadOnlyList<int> imageIds, CancellationToken ct = default);
}
