using BE_UmeClothing.Models;
using Microsoft.EntityFrameworkCore;

namespace BE_UmeClothing.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingItem> BookingItems => Set<BookingItem>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetCode> PasswordResetCodes => Set<PasswordResetCode>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("Users");
            e.HasKey(x => x.Id);
            e.Property(x => x.FullName).HasMaxLength(150).IsRequired();
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.Role);
        });

        modelBuilder.Entity<Category>(e =>
        {
            e.ToTable("Categories");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(120).IsRequired();
            e.Property(x => x.Description).HasMaxLength(1000);
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => x.Name);
        });

        modelBuilder.Entity<Product>(e =>
        {
            e.ToTable("Products");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasMaxLength(4000);
            e.Property(x => x.Color).HasMaxLength(50).IsRequired();
            e.Property(x => x.RentalPrice).HasColumnType("decimal(18,2)");
            e.Property(x => x.DepositPrice).HasColumnType("decimal(18,2)");

            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => x.Name);
            e.HasIndex(x => new { x.CategoryId, x.Status });
            e.HasIndex(x => x.RentalPrice);

            e.HasOne(x => x.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProductVariant>(e =>
        {
            // Tên bảng "ProductVariants" được dùng trong câu lệnh khóa UPDLOCK ở BookingService
            // (đây là đơn vị thực sự bị tranh chấp khi đặt thuê, không phải Product).
            e.ToTable("ProductVariants");
            e.HasKey(x => x.Id);
            e.Property(x => x.Size).HasMaxLength(30).IsRequired();

            // Mỗi size chỉ xuất hiện đúng 1 lần trong 1 sản phẩm.
            e.HasIndex(x => new { x.ProductId, x.Size }).IsUnique();

            e.HasOne(x => x.Product)
                .WithMany(p => p.Variants)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict); // không xóa Product kèm variant qua cascade, xử lý tường minh ở service
        });

        modelBuilder.Entity<ProductImage>(e =>
        {
            e.ToTable("ProductImages");
            e.HasKey(x => x.Id);
            e.Property(x => x.Url).HasMaxLength(1000).IsRequired();
            e.Property(x => x.PublicId).HasMaxLength(500).IsRequired();
            e.HasIndex(x => new { x.ProductId, x.SortOrder });

            e.HasOne(x => x.Product)
                .WithMany(p => p.Images)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Booking>(e =>
        {
            e.ToTable("Bookings");
            e.HasKey(x => x.Id);
            e.Property(x => x.BookingCode).HasMaxLength(30).IsRequired();
            e.Property(x => x.Subtotal).HasColumnType("decimal(18,2)");
            e.Property(x => x.Deposit).HasColumnType("decimal(18,2)");
            e.Property(x => x.Total).HasColumnType("decimal(18,2)");
            e.Property(x => x.CustomerNote).HasMaxLength(1000);
            e.Property(x => x.AdminNote).HasMaxLength(1000);
            e.Property(x => x.RowVersion).IsRowVersion();

            e.HasIndex(x => x.BookingCode).IsUnique();
            e.HasIndex(x => x.CustomerId);
            e.HasIndex(x => new { x.Status, x.CreatedAt });

            e.HasOne(x => x.Customer)
                .WithMany(u => u.Bookings)
                .HasForeignKey(x => x.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BookingItem>(e =>
        {
            e.ToTable("BookingItems");
            e.HasKey(x => x.Id);
            e.Property(x => x.Size).HasMaxLength(30).IsRequired();
            e.Property(x => x.RentalPrice).HasColumnType("decimal(18,2)");
            e.Property(x => x.DepositPrice).HasColumnType("decimal(18,2)");
            e.Property(x => x.Note).HasMaxLength(500);

            // Phục vụ truy vấn availability (theo từng size/variant, không phải theo Product).
            e.HasIndex(x => new { x.ProductVariantId, x.StartDate, x.EndDate });
            e.HasIndex(x => x.BookingId);

            e.HasOne(x => x.Booking)
                .WithMany(b => b.Items)
                .HasForeignKey(x => x.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.ProductVariant)
                .WithMany(v => v.BookingItems)
                .HasForeignKey(x => x.ProductVariantId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.ToTable("RefreshTokens");
            e.HasKey(x => x.Id);
            e.Property(x => x.TokenHash).HasMaxLength(88).IsRequired(); // SHA-256 base64 = 44 ký tự, chừa dư
            e.Property(x => x.ReplacedByTokenHash).HasMaxLength(88);

            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => new { x.UserId, x.RevokedAt, x.ExpiresAt }); // phục vụ thu hồi hàng loạt theo user

            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade); // token không phải dữ liệu nghiệp vụ cần giữ lại
        });

        modelBuilder.Entity<PasswordResetCode>(e =>
        {
            e.ToTable("PasswordResetCodes");
            e.HasKey(x => x.Id);
            e.Property(x => x.CodeHash).HasMaxLength(88).IsRequired();

            e.HasIndex(x => new { x.UserId, x.ConsumedAt, x.ExpiresAt }); // tìm mã còn hiệu lực của 1 user

            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
