using BE_UmeClothing.Models;

namespace BE_UmeClothing.Services.Interfaces;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateToken(User user);
}
