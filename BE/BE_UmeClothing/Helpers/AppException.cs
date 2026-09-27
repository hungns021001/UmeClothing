namespace BE_UmeClothing.Helpers;

public class AppException : Exception
{
    public int StatusCode { get; }
    public IReadOnlyList<string> Errors { get; }

    public AppException(int statusCode, string message, IEnumerable<string>? errors = null) : base(message)
    {
        StatusCode = statusCode;
        Errors = errors?.ToList() ?? new List<string>();
    }
}

public class BadRequestException : AppException
{
    public BadRequestException(string message, IEnumerable<string>? errors = null) : base(400, message, errors) { }
}

public class UnauthorizedException : AppException
{
    public UnauthorizedException(string message) : base(401, message) { }
}

public class ForbiddenException : AppException
{
    public ForbiddenException(string message) : base(403, message) { }
}

public class NotFoundException : AppException
{
    public NotFoundException(string message) : base(404, message) { }
}

public class ConflictException : AppException
{
    public ConflictException(string message, IEnumerable<string>? errors = null) : base(409, message, errors) { }
}
