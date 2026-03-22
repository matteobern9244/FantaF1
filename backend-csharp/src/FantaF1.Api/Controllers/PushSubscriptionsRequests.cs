namespace FantaF1.Api.Controllers;

public sealed record PushSubscriptionKeysRequest(
    string? P256dh,
    string? Auth);

public sealed record PushSubscriptionUpsertRequest(
    string? Endpoint,
    double? ExpirationTime,
    string? P256dh,
    string? Auth,
    PushSubscriptionKeysRequest? Keys);
