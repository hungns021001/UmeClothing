using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BE_UmeClothing.Helpers;
using BE_UmeClothing.Models;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace BE_UmeClothing.Services.Implementations;

public class TokenService : ITokenService
{
    private readonly JwtSettings _jwt;

    public TokenService(IOptions<JwtSettings> jwt)
    {
        _jwt = jwt.Value;
    }

    public (string Token, DateTime ExpiresAt) CreateToken(User user)
    {
        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(_jwt.ExpiryMinutes);

        // Dùng tên claim ngắn: "sub", "email", "role" (khớp cấu hình MapInboundClaims = false trong Program.cs).
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("role", user.Role.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
