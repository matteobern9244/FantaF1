namespace FantaF1.Application.Abstractions.Services;

public sealed class PushDeliveryFailedException : Exception
{
    public PushDeliveryFailedException(string message, bool deleteSubscription)
        : base(message)
    {
        DeleteSubscription = deleteSubscription;
    }

    public bool DeleteSubscription { get; }
}
