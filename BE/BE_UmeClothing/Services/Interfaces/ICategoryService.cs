using BE_UmeClothing.DTOs.Categories;

namespace BE_UmeClothing.Services.Interfaces;

public interface ICategoryService
{
    Task<List<CategoryDto>> GetAllAsync(bool includeInactive, CancellationToken ct = default);
    Task<CategoryDto> GetByIdAsync(int id, bool includeInactive, CancellationToken ct = default);
    Task<CategoryDto> GetBySlugAsync(string slug, bool includeInactive, CancellationToken ct = default);
    Task<CategoryDto> CreateAsync(CategoryRequest request, CancellationToken ct = default);
    Task<CategoryDto> UpdateAsync(int id, CategoryRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}
