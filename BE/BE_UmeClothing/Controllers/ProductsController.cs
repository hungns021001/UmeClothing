using BE_UmeClothing.DTOs.Products;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE_UmeClothing.Controllers;

[Route("api/products")]
public class ProductsController : ApiControllerBase
{
    private readonly IProductService _products;

    public ProductsController(IProductService products)
    {
        _products = products;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] ProductQuery query, CancellationToken ct) =>
        Success(await _products.GetPagedAsync(query, IsStaff, ct));

    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<IActionResult> Search([FromQuery] ProductQuery query, CancellationToken ct) =>
        Success(await _products.GetPagedAsync(query, IsStaff, ct));

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        Success(await _products.GetByIdAsync(id, IsStaff, ct));

    [HttpGet("slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct) =>
        Success(await _products.GetBySlugAsync(slug, IsStaff, ct));

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Create([FromBody] ProductRequest request, CancellationToken ct) =>
        CreatedSuccess(await _products.CreateAsync(request, ct), "Tạo sản phẩm thành công.");

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update(int id, [FromBody] ProductRequest request, CancellationToken ct) =>
        Success(await _products.UpdateAsync(id, request, ct), "Cập nhật sản phẩm thành công.");

    /// <summary>Chỉ Admin: xóa là thao tác không thể hoàn tác. Staff nên dùng trạng thái "Hidden" thay vì xóa.</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await _products.DeleteAsync(id, ct);
        return Success<object?>(null, "Xóa sản phẩm thành công.");
    }
}
