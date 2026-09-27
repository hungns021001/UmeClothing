using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BE_UmeClothing.Data;

/// <summary>Đọc DateTime từ SQL Server với Kind = Utc để JSON có hậu tố 'Z' (tránh lệch múi giờ ở frontend).</summary>
public class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeConverter()
        : base(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
    {
    }
}
