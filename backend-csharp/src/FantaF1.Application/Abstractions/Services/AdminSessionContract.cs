namespace FantaF1.Application.Abstractions.Services;

public static class AdminSessionContract
{
    public const string AdminRole = "admin";
    public const string CookieName = "fantaf1_admin_session";
    public const string CookieAttributes = "; Path=/; HttpOnly; SameSite=Lax";
    public const string DefaultSessionSecret = "fantaf1-dev-session-secret";
    public const string DevelopmentDefaultViewMode = "admin";
    public const string DevelopmentEnvironment = "development";
    public const string InvalidPasswordCode = "admin_auth_invalid";
    public const string InvalidPasswordError = "Invalid password";
    public const string ProductionEnvironment = "production";
    public const string ProductionLikeEnvironment = "production-like";
    public const string ProductionLikeDefaultViewMode = "public";
    public const string SessionSecretEnvironmentVariableName = "ADMIN_SESSION_SECRET";
    public static readonly TimeSpan SessionTtl = TimeSpan.FromDays(7);

    public static bool IsProductionLikeEnvironment(string environment)
    {
        return string.Equals(environment, ProductionEnvironment, StringComparison.Ordinal)
            || string.Equals(environment, ProductionLikeEnvironment, StringComparison.Ordinal);
    }

    public static string ResolveDefaultViewMode(string environment)
    {
        return IsProductionLikeEnvironment(environment)
            ? ProductionLikeDefaultViewMode
            : DevelopmentDefaultViewMode;
    }
}
