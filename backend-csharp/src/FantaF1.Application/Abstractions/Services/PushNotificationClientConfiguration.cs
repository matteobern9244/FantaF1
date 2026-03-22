namespace FantaF1.Application.Abstractions.Services;

public sealed record PushNotificationClientConfiguration(
    bool Enabled,
    string PublicKey);
