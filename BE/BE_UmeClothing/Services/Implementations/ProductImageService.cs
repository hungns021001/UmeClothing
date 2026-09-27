using BE_UmeClothing.Data;
using BE_UmeClothing.DTOs.Products;
using BE_UmeClothing.Helpers;
using BE_UmeClothing.Mappings;
using BE_UmeClothing.Models;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BE_UmeClothing.Services.Implementations;

public class ProductImageService : IProductImageService
{
    private readonly AppDbContext _db;
    private readonly IImageStorageService _storage;
    private readonly ImageStorageOptions _opt;
    private readonly ILogger<ProductImageService> _logger;

    public ProductImageService(AppDbContext db, IImageStorageService storage, IOptions<ImageStorageOptions> options, ILogger<ProductImageService> logger)
    {
        _db = db;
        _storage = storage;
        _opt = options.Value;
        _logger = logger;
    }

    public async Task<List<ProductImageDto>> UploadAsync(int productId, IReadOnlyList<IFormFile> files, CancellationToken ct = default)
    {
        if (files.Count == 0)
            throw new BadRequestException("Chưa chọn file ảnh nào.");

        var product = await LoadProductAsync(productId, ct);

        if (product.Images.Count + files.Count > _opt.MaxImagesPerProduct)
            throw new BadRequestException($"Mỗi sản phẩm tối đa {_opt.MaxImagesPerProduct} ảnh.");

        // Validate toàn bộ trước khi upload bất kỳ file nào.
        var contentTypes = new List<string>();
        foreach (var file in files)
            contentTypes.Add(await ImageValidator.ValidateAsync(file, _opt.MaxFileSizeBytes, ct));

        var nextOrder = product.Images.Count == 0 ? 0 : product.Images.Max(i => i.SortOrder) + 1;
        var hasPrimary = product.Images.Any(i => i.IsPrimary);
        var uploaded = new List<ImageUploadResult>();

        try
        {
            for (var idx = 0; idx < files.Count; idx++)
            {
                await using var stream = files[idx].OpenReadStream();
                var result = await _storage.UploadAsync(stream, contentTypes[idx], $"products/{productId}", ct);
                uploaded.Add(result);

                product.Images.Add(new ProductImage
                {
                    ProductId = productId,
                    Url = result.Url,
                    PublicId = result.PublicId,
                    SortOrder = nextOrder++,
                    IsPrimary = !hasPrimary
                });
                hasPrimary = true;
            }

            product.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        catch
        {
            // Dọn file đã upload nếu không lưu được DB, tránh file mồ côi.
            foreach (var u in uploaded)
                await TryDeleteBlobAsync(u.PublicId);
            throw;
        }

        return product.Images.OrderBy(i => i.SortOrder).Select(i => i.ToDto()).ToList();
    }

    public async Task<List<ProductImageDto>> DeleteAsync(int productId, int imageId, CancellationToken ct = default)
    {
        var product = await LoadProductAsync(productId, ct);
        var image = product.Images.FirstOrDefault(i => i.Id == imageId)
                    ?? throw new NotFoundException("Không tìm thấy ảnh.");

        var wasPrimary = image.IsPrimary;
        var publicId = image.PublicId;

        product.Images.Remove(image);
        _db.ProductImages.Remove(image);

        if (wasPrimary)
        {
            var next = product.Images.OrderBy(i => i.SortOrder).FirstOrDefault();
            if (next is not null)
                next.IsPrimary = true;
        }

        product.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        await TryDeleteBlobAsync(publicId);

        return product.Images.OrderBy(i => i.SortOrder).Select(i => i.ToDto()).ToList();
    }

    public async Task<List<ProductImageDto>> SetPrimaryAsync(int productId, int imageId, CancellationToken ct = default)
    {
        var product = await LoadProductAsync(productId, ct);
        if (product.Images.All(i => i.Id != imageId))
            throw new NotFoundException("Không tìm thấy ảnh.");

        foreach (var image in product.Images)
            image.IsPrimary = image.Id == imageId;

        product.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return product.Images.OrderBy(i => i.SortOrder).Select(i => i.ToDto()).ToList();
    }

    public async Task<List<ProductImageDto>> ReorderAsync(int productId, IReadOnlyList<int> imageIds, CancellationToken ct = default)
    {
        var product = await LoadProductAsync(productId, ct);

        var existing = product.Images.Select(i => i.Id).OrderBy(x => x).ToList();
        var requested = imageIds.OrderBy(x => x).ToList();
        if (!existing.SequenceEqual(requested))
            throw new BadRequestException("Danh sách ảnh phải gồm đầy đủ và đúng các ảnh của sản phẩm, không trùng lặp.");

        for (var order = 0; order < imageIds.Count; order++)
            product.Images.First(i => i.Id == imageIds[order]).SortOrder = order;

        product.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return product.Images.OrderBy(i => i.SortOrder).Select(i => i.ToDto()).ToList();
    }

    private async Task<Product> LoadProductAsync(int productId, CancellationToken ct) =>
        await _db.Products.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == productId, ct)
        ?? throw new NotFoundException("Không tìm thấy sản phẩm.");

    private async Task TryDeleteBlobAsync(string publicId)
    {
        try
        {
            await _storage.DeleteAsync(publicId, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not delete stored image {PublicId}", publicId);
        }
    }
}
