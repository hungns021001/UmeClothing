using BE_UmeClothing.Helpers;
using BE_UmeClothing.Models;
using BE_UmeClothing.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace BE_UmeClothing.Data;

public static class DbSeeder
{
    public static async Task InitializeAsync(IServiceProvider services, IConfiguration config, ILogger logger)
    {
        var db = services.GetRequiredService<AppDbContext>();

        // GetMigrations() là API đồng bộ (chỉ đọc danh sách migration trong assembly, không truy cập DB).
        if (!db.Database.GetMigrations().Any())
        {
            throw new InvalidOperationException(
                "Chưa có migration nào. Chạy: dotnet ef migrations add InitialCreate " +
                "(hoặc Add-Migration InitialCreate trong Package Manager Console) rồi khởi động lại.");
        }

        await db.Database.MigrateAsync();
        await SeedUsersAsync(db, config, logger);
        await SeedCatalogAsync(db, logger);
    }

    private static async Task SeedUsersAsync(AppDbContext db, IConfiguration config, ILogger logger)
    {
        if (await db.Users.AnyAsync(u => u.Role == UserRole.Admin || u.Role == UserRole.Staff))
            return;

        var adminPassword = config["Seed:AdminPassword"];
        var staffPassword = config["Seed:StaffPassword"];
        if (string.IsNullOrWhiteSpace(adminPassword) || string.IsNullOrWhiteSpace(staffPassword))
            throw new InvalidOperationException("Cần cấu hình Seed:AdminPassword và Seed:StaffPassword để seed tài khoản.");

        db.Users.AddRange(
            new User
            {
                FullName = "Administrator",
                Email = "admin@umeclothing.com",
                Phone = "0900000001",
                PasswordHash = PasswordHelper.Hash(adminPassword),
                Role = UserRole.Admin
            },
            new User
            {
                FullName = "Staff Demo",
                Email = "staff@umeclothing.com",
                Phone = "0900000002",
                PasswordHash = PasswordHelper.Hash(staffPassword),
                Role = UserRole.Staff
            });

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded admin & staff accounts.");
    }

    private static async Task SeedCatalogAsync(AppDbContext db, ILogger logger)
    {
        if (await db.Categories.AnyAsync())
            return;

        var names = new[] { "Dress", "Suit", "Shirt", "Skirt", "Accessories" };
        var categories = names.ToDictionary(
            n => n,
            n => new Category { Name = n, Slug = SlugHelper.Generate(n), Description = $"{n} for rent" });

        db.Categories.AddRange(categories.Values);
        await db.SaveChangesAsync();

        Product P(string cat, string name, decimal rent, decimal deposit, string color, string desc, params string[] sizes) => new()
        {
            CategoryId = categories[cat].Id,
            Name = name,
            Slug = SlugHelper.Generate(name),
            Description = desc,
            RentalPrice = rent,
            DepositPrice = deposit,
            Color = color,
            Status = ProductStatus.Available,
            Variants = sizes.Select(s => new ProductVariant { Size = s, Status = ProductStatus.Available }).ToList()
        };

        db.Products.AddRange(
            P("Dress", "Váy dạ hội satin đỏ", 350000, 1500000, "Đỏ", "Váy dạ hội satin dáng dài, phù hợp tiệc cưới và sự kiện.", "S", "M", "L"),
            P("Dress", "Đầm công chúa trắng", 300000, 1200000, "Trắng", "Đầm xòe tùng voan nhẹ, phù hợp chụp ảnh kỷ yếu, cưới.", "S", "M"),
            P("Dress", "Đầm cocktail đen", 250000, 1000000, "Đen", "Đầm cocktail dáng ôm, sang trọng.", "M", "L"),
            P("Suit", "Vest nam xanh navy", 400000, 2000000, "Xanh navy", "Bộ vest 2 mảnh, chất liệu wool pha.", "M", "L", "XL"),
            P("Suit", "Vest nam xám ghi", 380000, 1800000, "Xám", "Vest slim-fit lịch lãm cho sự kiện công sở.", "M", "L"),
            P("Shirt", "Áo sơ mi lụa kem", 120000, 400000, "Kem", "Sơ mi lụa mềm, phù hợp phối vest.", "S", "M", "L"),
            P("Skirt", "Chân váy xếp ly", 150000, 500000, "Be", "Chân váy xếp ly dài qua gối.", "S", "M"),
            P("Accessories", "Set trang sức ngọc trai", 100000, 800000, "Trắng ngọc trai", "Vòng cổ và bông tai ngọc trai nhân tạo.", "Free size"));

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded demo categories & products.");
    }
}
