namespace FantaF1.Infrastructure.Push;

public sealed class WebPushOptions
{
    public const string ConfigurationSectionName = "WebPush";
    public const string PublicKeyConfigurationPath = $"{ConfigurationSectionName}:PublicKey";
    public const string PrivateKeyConfigurationPath = $"{ConfigurationSectionName}:PrivateKey";
    public const string SubjectConfigurationPath = $"{ConfigurationSectionName}:Subject";

    public string PublicKey { get; init; } = string.Empty;
    public string PrivateKey { get; init; } = string.Empty;
    public string Subject { get; init; } = string.Empty;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(PublicKey)
        && !string.IsNullOrWhiteSpace(PrivateKey)
        && !string.IsNullOrWhiteSpace(Subject);
}
