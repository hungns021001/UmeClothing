namespace BE_UmeClothing.Helpers;

public static class ImageValidator
{
    /// <summary>Kiểm tra kích thước + magic bytes (không tin Content-Type/tên file từ client). Trả về content-type thật.</summary>
    public static async Task<string> ValidateAsync(IFormFile file, long maxBytes, CancellationToken ct)
    {
        if (file.Length == 0)
            throw new BadRequestException($"File '{Safe(file.FileName)}' rỗng.");
        if (file.Length > maxBytes)
            throw new BadRequestException($"File '{Safe(file.FileName)}' vượt quá {maxBytes / (1024 * 1024)}MB.");

        var header = new byte[12];
        await using var stream = file.OpenReadStream();
        var read = await stream.ReadAsync(header.AsMemory(0, 12), ct);
        if (read < 12)
            throw new BadRequestException($"File '{Safe(file.FileName)}' không phải ảnh hợp lệ.");

        if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return "image/jpeg";

        if (header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
            header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A)
            return "image/png";

        if (header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' &&
            header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P')
            return "image/webp";

        throw new BadRequestException($"File '{Safe(file.FileName)}' không phải ảnh JPEG/PNG/WEBP hợp lệ.");
    }

    private static string Safe(string name) => Path.GetFileName(name);
}
