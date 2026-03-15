namespace FantaF1.Domain.ReadModels;

public sealed record AppDataSanitizationOptions(
    bool PreferPayloadSelectedWeekend,
    IReadOnlyList<string>? ParticipantRoster)
{
    public static AppDataSanitizationOptions Default { get; } = new(
        PreferPayloadSelectedWeekend: false,
        ParticipantRoster: null);
}
