using BE_UmeClothing.Models.Enums;

namespace BE_UmeClothing.DTOs.Users;

/// <summary>Không bao giờ chứa PasswordHash.</summary>
public record UserDto(int Id, string FullName, string Email, string? Phone, UserRole Role, bool IsActive, DateTime CreatedAt);
