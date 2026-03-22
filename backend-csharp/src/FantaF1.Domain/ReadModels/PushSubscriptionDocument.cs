using FantaF1.Domain.Common;

namespace FantaF1.Domain.ReadModels;

public sealed record PushSubscriptionDocument(
    string Endpoint,
    string? P256dh,
    string? Auth,
    double? ExpirationTime) : IEntity<string>
{
    public string Id => Endpoint;
}
