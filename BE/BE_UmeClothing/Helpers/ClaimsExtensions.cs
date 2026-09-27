using System.Security.Claims;

namespace BE_UmeClothing.Helpers;

public static class ClaimsExtensions
{
    /// <summary>JWT dùng claim "sub" cho UserId (MapInboundClaims = false).</summary>
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirst("sub")?.Value;
        if (!int.TryParse(value, out var id))
            throw new UnauthorizedException("Token không hợp lệ.");
        return id;
    }
}
