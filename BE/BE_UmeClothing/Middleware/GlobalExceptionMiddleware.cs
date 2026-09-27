using BE_UmeClothing.DTOs.Common;
using BE_UmeClothing.Helpers;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace BE_UmeClothing.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            await WriteAsync(context, ex.StatusCode, ex.Message, ex.Errors);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Client đã hủy request; không cần phản hồi.
            _logger.LogDebug("Request cancelled by client: {Path}", context.Request.Path);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            _logger.LogWarning(ex, "Unique constraint violation on {Path}", context.Request.Path);
            await WriteAsync(context, StatusCodes.Status409Conflict, "Dữ liệu bị trùng (email, slug hoặc mã đã tồn tại).");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);

            var errors = _env.IsDevelopment() ? new[] { ex.Message } : Array.Empty<string>();
            await WriteAsync(context, StatusCodes.Status500InternalServerError,
                "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.", errors);
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is SqlException { Number: 2601 or 2627 };

    private static async Task WriteAsync(HttpContext context, int statusCode, string message, IEnumerable<string>? errors = null)
    {
        if (context.Response.HasStarted)
            return;

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(message, errors));
    }
}
