using BE_UmeClothing.DTOs.Categories;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE_UmeClothing.Controllers;

[Route("api/categories")]
public class CategoriesController : ApiControllerBase
{
    private readonly ICategoryService _categories;

    public CategoriesController(ICategoryService categories)
    {
        _categories = categories;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Success(await _categories.GetAllAsync(IsStaff, ct));

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        Success(await _categories.GetByIdAsync(id, IsStaff, ct));

    [HttpGet("slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct) =>
        Success(await _categories.GetBySlugAsync(slug, IsStaff, ct));

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Create([FromBody] CategoryRequest request, CancellationToken ct) =>
        CreatedSuccess(await _categories.CreateAsync(request, ct), "Tạo danh mục thành công.");

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update(int id, [FromBody] CategoryRequest request, CancellationToken ct) =>
        Success(await _categories.UpdateAsync(id, request, ct), "Cập nhật danh mục thành công.");

    /// <summary>Chỉ Admin: xóa là thao tác không thể hoàn tác. Staff nên dùng IsActive=false thay vì xóa.</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await _categories.DeleteAsync(id, ct);
        return Success<object?>(null, "Xóa danh mục thành công.");
    }
}
