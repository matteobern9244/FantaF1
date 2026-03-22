namespace FantaF1.Application.Abstractions.Services;

public sealed class PushSubscriptionNotFoundException : Exception
{
    public PushSubscriptionNotFoundException(string endpoint)
        : base($"Push subscription not found for endpoint '{endpoint}'.")
    {
        Endpoint = endpoint;
    }

    public string Endpoint { get; }
}
