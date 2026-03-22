namespace FantaF1.Application.Abstractions.Services;

public static class PushNotificationsContract
{
    public const int BadRequestStatusCode = 400;
    public const int DeliveryFailedStatusCode = 502;
    public const string EndpointMissingCode = "push_notification_endpoint_missing";
    public const string EndpointMissingError = "Push notification endpoint is required.";
    public const string SubscriptionNotFoundCode = "push_notification_subscription_missing";
    public const string SubscriptionNotFoundError = "Push subscription not found.";
    public const string DeliveryFailedCode = "push_notification_delivery_failed";
    public const string DeliveryFailedError = "Failed to deliver push notification.";
    public const string TestNotificationTitle = "Fanta Formula 1";
    public const string TestNotificationBody = "Notifica push di test consegnata correttamente.";
    public const string TestNotificationUrl = "/gara#weekend-live";
    public const string TestNotificationTag = "push-test";
}
