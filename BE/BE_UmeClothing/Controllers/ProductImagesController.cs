using BE_UmeClothing.DTOs.Products;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE_UmeClothing.Controllers;

[Route("api/products/{productId:int}/images")]
[Authorize(Roles = "Admin,Staff")]
public class ProductImagesController : ApiControllerBase
{
    private readonly IProductImageService _images;

    public ProductImagesController(IProductImageService images)
    {
        _images = images;
    }

    /// <summary>Upload nhiều ảnh (multipart/form-data, field "files"). Ảnh đầu tiên của sản phẩm tự động là ảnh chính.</summary>
    [HttpPost]
    [RequestSizeLimit(60_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 60_000_000)]
    public async Task<IActionResult> Upload(int productId, [FromForm] List<IFormFile> files, CancellationToken ct) =>
        CreatedSuccess(await _images.UploadAsync(productId, files, ct), "Upload ảnh thành công.");

    [HttpDelete("{imageId:int}")]
    public async Task<IActionResult> Delete(int productId, int imageId, CancellationToken ct) =>
        Success(await _images.DeleteAsync(productId, imageId, ct), "Đã xóa ảnh.");

    [HttpPut("{imageId:int}/primary")]
    public async Task<IActionResult> SetPrimary(int productId, int imageId, CancellationToken ct) =>
        Success(await _images.SetPrimaryAsync(productId, imageId, ct), "Đã đổi ảnh chính.");

    [HttpPut("order")]
    public async Task<IActionResult> Reorder(int productId, [FromBody] ReorderImagesRequest request, CancellationToken ct) =>
        Success(await _images.ReorderAsync(productId, request.ImageIds, ct), "Đã cập nhật thứ tự ảnh.");
}
