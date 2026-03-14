namespace FantaF1.Application.Abstractions.System;

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}
