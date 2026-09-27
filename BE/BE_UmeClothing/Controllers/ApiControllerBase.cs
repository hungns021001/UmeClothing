using BE_UmeClothing.DTOs.Common;
using BE_UmeClothing.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace BE_UmeClothing.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected int CurrentUserId => User.GetUserId();

    protected bool IsStaff => User.IsInRole("Admin") || User.IsInRole("Staff");

    protected IActionResult Success<T>(T data, string message = "Thành công") =>
        Ok(ApiResponse<T>.Ok(data, message));

    protected IActionResult CreatedSuccess<T>(T data, string message = "Tạo thành công") =>
        StatusCode(StatusCodes.Status201Created, ApiResponse<T>.Ok(data, message));
}
