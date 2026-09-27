namespace BE_UmeClothing.Services.Interfaces;

public record ImageUploadResult(string Url, string PublicId);

/// <summary>
/// Abstraction cho lưu trữ ảnh. Triển khai mặc định: LocalImageStorageService.
/// Để dùng Cloudinary/Cloudflare R2: tạo class implement interface này rồi đổi đăng ký DI trong Program.cs.
/// </summary>
public interface IImageStorageService
{
    /// <param name="content">Nội dung ảnh đã được validate.</param>
    /// <param name="contentType">image/jpeg | image/png | image/webp</param>
    /// <param name="folder">Thư mục logic, ví dụ "products/12".</param>
    Task<ImageUploadResult> UploadAsync(Stream content, string contentType, string folder, CancellationToken ct = default);

    Task DeleteAsync(string publicId, CancellationToken ct = default);
}
