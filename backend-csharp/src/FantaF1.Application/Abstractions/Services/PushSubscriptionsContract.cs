namespace FantaF1.Application.Abstractions.Services;

public static class PushSubscriptionsContract
{
    public const int BadRequestStatusCode = 400;
    public const int NotFoundStatusCode = 404;
    public const int InternalServerErrorStatusCode = 500;

    public const string InvalidSubscriptionCode = "push_subscription_invalid";
    public const string InvalidSubscriptionError = "Push subscription payload is invalid.";
    public const string EndpointMissingCode = "push_subscription_endpoint_missing";
    public const string EndpointMissingError = "Push subscription endpoint is required.";
    public const string StorageWriteFailedCode = "push_subscription_write_failed";
    public const string StorageWriteFailedError = "Failed to save push subscription.";
    public const string StorageDeleteFailedCode = "push_subscription_delete_failed";
    public const string StorageDeleteFailedError = "Failed to delete push subscription.";
    public const string DeliveryUnavailableCode = "push_delivery_unavailable";
    public const string DeliveryUnavailableError = "Push delivery is not configured.";
    public const string DeliveryFailedCode = "push_delivery_failed";
    public const string DeliveryFailedError = "Failed to deliver push notification.";
}
