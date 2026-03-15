namespace FantaF1.Application.Abstractions.System;

public interface ISignedCookieService
{
    string Sign(string value);

    bool TryVerify(string signedValue, out string? unsignedValue);
}
