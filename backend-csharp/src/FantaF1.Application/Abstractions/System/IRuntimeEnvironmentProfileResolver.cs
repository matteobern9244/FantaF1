namespace FantaF1.Application.Abstractions.System;

public interface IRuntimeEnvironmentProfileResolver
{
    RuntimeEnvironmentProfile ResolveCurrentProfile();
}

public sealed record RuntimeEnvironmentProfile(
    string Environment,
    string DatabaseTarget);
