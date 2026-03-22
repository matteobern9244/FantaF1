namespace FantaF1.Application.Abstractions.Services;

public sealed record PushNotificationPayload(
    string Title,
    string Body,
    string Url,
    string Tag);
