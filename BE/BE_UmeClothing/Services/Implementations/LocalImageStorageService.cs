using BE_UmeClothing.Helpers;
using BE_UmeClothing.Services.Interfaces;

namespace BE_UmeClothing.Services.Implementations;

/// <summary>
/// Lưu ảnh vào wwwroot/uploads (chỉ dành cho dev/demo hoặc single-server).
/// Url trả về là đường dẫn tương đối "/uploads/..." — frontend ghép với origin của API.
/// Production nên thay bằng Cloudinary / Cloudflare R2 (implement IImageStorageService).
/// </summary>
public class LocalImageStorageService : IImageStorageService
{
    private readonly string _root;

    public LocalImageStorageService(IWebHostEnvironment env)
    {
        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        _root = Path.GetFullPath(Path.Combine(webRoot, "uploads"));
        Directory.CreateDirectory(_root);
    }

    public async Task<ImageUploadResult> UploadAsync(Stream content, string contentType, string folder, CancellationToken ct = default)
    {
        var extension = contentType switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => throw new BadRequestException("Định dạng ảnh không được hỗ trợ.")
        };

        // Tên file do server sinh, không dùng tên file của client (chống path traversal).
        var safeFolder = string.Join('/', folder.Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => new string(part.Where(char.IsLetterOrDigit).ToArray()))
            .Where(part => part.Length > 0));

        var publicId = $"{safeFolder}/{Guid.NewGuid():N}{extension}";
        var fullPath = ResolvePath(publicId);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await using var fs = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true);
        await content.CopyToAsync(fs, ct);

        return new ImageUploadResult($"/uploads/{publicId}", publicId);
    }

    public Task DeleteAsync(string publicId, CancellationToken ct = default)
    {
        var fullPath = ResolvePath(publicId);
        if (File.Exists(fullPath))
            File.Delete(fullPath);
        return Task.CompletedTask;
    }

    private string ResolvePath(string publicId)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_root, publicId.Replace('/', Path.DirectorySeparatorChar)));
        if (!fullPath.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw new BadRequestException("PublicId không hợp lệ.");
        return fullPath;
    }
}
