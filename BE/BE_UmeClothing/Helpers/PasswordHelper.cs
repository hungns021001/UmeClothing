namespace BE_UmeClothing.Helpers;

public static class PasswordHelper
{
    private const int WorkFactor = 11;

    // Hash giả để verify khi không tìm thấy user, giảm chênh lệch thời gian phản hồi (user enumeration).
    private static readonly string DummyHash = BCrypt.Net.BCrypt.HashPassword("dummy-password-for-timing", WorkFactor);

    public static string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);

    public static bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);

    public static void BurnTime(string password) => BCrypt.Net.BCrypt.Verify(password, DummyHash);
}
