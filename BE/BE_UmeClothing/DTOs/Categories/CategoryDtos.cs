using System.ComponentModel.DataAnnotations;

namespace BE_UmeClothing.DTOs.Categories;

public class CategoryRequest
{
    [Required(ErrorMessage = "Tên danh mục là bắt buộc.")]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(120)]
    public string? Slug { get; set; }

    [StringLength(1000)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;
}

public record CategoryDto(
    int Id, string Name, string Slug, string? Description, bool IsActive,
    int ProductCount, DateTime CreatedAt, DateTime UpdatedAt);
