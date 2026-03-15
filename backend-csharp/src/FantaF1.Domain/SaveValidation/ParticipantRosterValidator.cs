using FantaF1.Domain.ReadModels;

namespace FantaF1.Domain.SaveValidation;

public sealed class ParticipantRosterValidator
{
    private const int ParticipantSlots = 3;

    public IReadOnlyList<string>? ResolveParticipantRoster(IReadOnlyList<AppDataUserDocument>? incomingUsers)
    {
        if (incomingUsers is null || incomingUsers.Count != ParticipantSlots)
        {
            return null;
        }

        var normalizedNames = incomingUsers
            .Select(user => user.Name?.Trim() ?? string.Empty)
            .ToArray();

        if (normalizedNames.Any(string.IsNullOrEmpty))
        {
            return null;
        }

        return normalizedNames.Distinct(StringComparer.Ordinal).Count() == ParticipantSlots
            ? normalizedNames
            : null;
    }

    public bool ValidateParticipants(
        IReadOnlyList<AppDataUserDocument>? incomingUsers,
        IReadOnlyList<string>? requiredParticipants)
    {
        var normalizedIncomingNames = ResolveParticipantRoster(incomingUsers);
        if (normalizedIncomingNames is null)
        {
            return false;
        }

        if (requiredParticipants is null || requiredParticipants.Count != ParticipantSlots)
        {
            return true;
        }

        return normalizedIncomingNames.OrderBy(static value => value, StringComparer.Ordinal).SequenceEqual(
            requiredParticipants.OrderBy(static value => value, StringComparer.Ordinal),
            StringComparer.Ordinal);
    }
}
