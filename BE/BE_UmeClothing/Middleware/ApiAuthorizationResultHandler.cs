using BE_UmeClothing.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace BE_UmeClothing.Middleware;

/// <summary>Trả 401/403 theo đúng định dạng ApiResponse thay vì body rỗng.</summary>
public class ApiAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _default = new();

    public async Task HandleAsync(RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Challenged)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail("Bạn cần đăng nhập để thực hiện thao tác này."));
            return;
        }

        if (authorizeResult.Forbidden)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail("Bạn không có quyền thực hiện thao tác này."));
            return;
        }

        await _default.HandleAsync(next, context, policy, authorizeResult);
    }
}
