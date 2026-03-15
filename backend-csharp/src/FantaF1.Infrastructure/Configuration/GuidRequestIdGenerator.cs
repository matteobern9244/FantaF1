using FantaF1.Application.Abstractions.System;

namespace FantaF1.Infrastructure.Configuration;

public sealed class GuidRequestIdGenerator : IRequestIdGenerator
{
    public string Generate()
    {
        return Guid.NewGuid().ToString();
    }
}
