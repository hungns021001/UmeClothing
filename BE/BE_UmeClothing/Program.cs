using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using BE_UmeClothing.Data;
using BE_UmeClothing.DTOs.Common;
using BE_UmeClothing.Helpers;
using BE_UmeClothing.Hubs;
using BE_UmeClothing.Middleware;
using BE_UmeClothing.Services.Implementations;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------------- Configuration / Options ----------------
builder.Services.Configure<JwtSettings>(config.GetSection("Jwt"));
builder.Services.Configure<BookingOptions>(config.GetSection("Booking"));
builder.Services.Configure<ImageStorageOptions>(config.GetSection("ImageStorage"));
builder.Services.Configure<PasswordResetOptions>(config.GetSection("PasswordReset"));
builder.Services.Configure<SmtpOptions>(config.GetSection("Smtp"));

var jwt = config.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
if (string.IsNullOrWhiteSpace(jwt.Key) || jwt.Key.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key chưa được cấu hình hoặc ngắn hơn 32 ký tự. " +
        "Đặt bằng user-secrets (dotnet user-secrets set \"Jwt:Key\" \"...\") hoặc biến môi trường Jwt__Key.");
}

// ---------------- Database ----------------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(config.GetConnectionString("DefaultConnection")));

// ---------------- Controllers / JSON / Validation ----------------
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()))
    .ConfigureApiBehaviorOptions(o =>
    {
        o.InvalidModelStateResponseFactory = ctx =>
        {
            var errors = ctx.ModelState
                .Where(kv => kv.Value is { Errors.Count: > 0 })
                .SelectMany(kv => kv.Value!.Errors.Select(e =>
                    string.IsNullOrWhiteSpace(e.ErrorMessage) ? $"{kv.Key}: giá trị không hợp lệ." : e.ErrorMessage))
                .ToList();

            return new BadRequestObjectResult(ApiResponse<object>.Fail("Dữ liệu không hợp lệ.", errors));
        };
    });

// ---------------- SignalR ----------------
builder.Services.AddSignalR()
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// ---------------- Authentication / Authorization ----------------
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Giữ nguyên tên claim ngắn trong token: "sub", "email", "role".
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "sub",
            RoleClaimType = "role"
        };

        // WebSocket không gửi được header Authorization -> SignalR gửi token qua query "access_token".
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"].ToString();
                if (!string.IsNullOrEmpty(accessToken) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs/notifications"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, ApiAuthorizationResultHandler>();

// ---------------- Rate limiting (chống brute-force login/register) ----------------
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(
            ApiResponse<object>.Fail("Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút."), token);
    };
});

// ---------------- CORS ----------------
var allowedOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()); // SignalR negotiate cần credentials
});

// ---------------- Swagger ----------------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "UmeClothing API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập JWT token (không cần tiền tố 'Bearer ')."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ---------------- Dependency Injection ----------------
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRefreshTokenService, RefreshTokenService>();

// Tự động chọn: nếu Smtp:Host đã được cấu hình (ví dụ SMTP relay của Brevo) thì gửi email thật qua SMTP;
// nếu chưa cấu hình gì (mặc định lúc mới clone repo) thì rơi về chỉ ghi log, không gửi — để dev/test được ngay
// mà không bắt buộc phải có tài khoản email thật.
var smtpConfigured = config.GetSection("Smtp").Get<SmtpOptions>()?.IsConfigured ?? false;
if (smtpConfigured)
    builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
else
    builder.Services.AddSingleton<IEmailSender, LoggingEmailSender>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IProductVariantService, ProductVariantService>();
builder.Services.AddScoped<IProductImageService, ProductImageService>();
builder.Services.AddScoped<IAvailabilityService, AvailabilityService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IRealtimeNotifier, RealtimeNotifier>();

// Đổi sang Cloudinary/Cloudflare R2: viết class implement IImageStorageService rồi thay dòng này.
builder.Services.AddSingleton<IImageStorageService, LocalImageStorageService>();

builder.Services.AddHostedService<PendingBookingExpiryService>();

var app = builder.Build();

// ---------------- Migrate + Seed (tùy chọn) ----------------
if (config.GetValue<bool>("Database:AutoMigrateAndSeed"))
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await DbSeeder.InitializeAsync(scope.ServiceProvider, config, logger);
}

// ---------------- Pipeline ----------------
app.UseMiddleware<GlobalExceptionMiddleware>();

    app.UseSwagger();
    app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();
