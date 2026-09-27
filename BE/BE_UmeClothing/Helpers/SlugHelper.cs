using System.Globalization;
using System.Text;

namespace BE_UmeClothing.Helpers;

public static class SlugHelper
{
    public static string Generate(string text, int maxLength = 100)
    {
        var normalized = (text ?? string.Empty).Trim().ToLowerInvariant().Replace('đ', 'd').Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();

        foreach (var c in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(c);
            if (category == UnicodeCategory.NonSpacingMark)
                continue;

            if (c < 128 && char.IsLetterOrDigit(c))
                sb.Append(c);
            else if (sb.Length > 0 && sb[^1] != '-')
                sb.Append('-');
        }

        var slug = sb.ToString().Trim('-');
        if (slug.Length > maxLength)
            slug = slug[..maxLength].Trim('-');

        return string.IsNullOrEmpty(slug) ? "item" : slug;
    }
}
