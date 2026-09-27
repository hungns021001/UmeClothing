using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE_UmeClothing.Migrations
{
    /// <inheritdoc />
    public partial class AddRefreshTokensAndPasswordReset : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BookingItems_Products_ProductId",
                table: "BookingItems");

            migrationBuilder.DropColumn(
                name: "Size",
                table: "Products");

            migrationBuilder.RenameColumn(
                name: "ProductId",
                table: "BookingItems",
                newName: "ProductVariantId");

            migrationBuilder.RenameIndex(
                name: "IX_BookingItems_ProductId_StartDate_EndDate",
                table: "BookingItems",
                newName: "IX_BookingItems_ProductVariantId_StartDate_EndDate");

            migrationBuilder.AddColumn<string>(
                name: "Size",
                table: "BookingItems",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "PasswordResetCodes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    CodeHash = table.Column<string>(type: "nvarchar(88)", maxLength: 88, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ConsumedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Attempts = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordResetCodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PasswordResetCodes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductVariants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Size = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductVariants_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetCodes_UserId_ConsumedAt_ExpiresAt",
                table: "PasswordResetCodes",
                columns: new[] { "UserId", "ConsumedAt", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_ProductId_Size",
                table: "ProductVariants",
                columns: new[] { "ProductId", "Size" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_BookingItems_ProductVariants_ProductVariantId",
                table: "BookingItems",
                column: "ProductVariantId",
                principalTable: "ProductVariants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BookingItems_ProductVariants_ProductVariantId",
                table: "BookingItems");

            migrationBuilder.DropTable(
                name: "PasswordResetCodes");

            migrationBuilder.DropTable(
                name: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "Size",
                table: "BookingItems");

            migrationBuilder.RenameColumn(
                name: "ProductVariantId",
                table: "BookingItems",
                newName: "ProductId");

            migrationBuilder.RenameIndex(
                name: "IX_BookingItems_ProductVariantId_StartDate_EndDate",
                table: "BookingItems",
                newName: "IX_BookingItems_ProductId_StartDate_EndDate");

            migrationBuilder.AddColumn<string>(
                name: "Size",
                table: "Products",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddForeignKey(
                name: "FK_BookingItems_Products_ProductId",
                table: "BookingItems",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
