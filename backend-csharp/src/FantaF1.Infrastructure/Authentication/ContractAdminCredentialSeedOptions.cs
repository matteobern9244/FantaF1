namespace FantaF1.Infrastructure.Authentication;

public sealed class ContractAdminCredentialSeedOptions
{
    public const string ConfigurationSectionName = "AdminCredentialSeed";
    public const string PasswordHashHexConfigurationPath = $"{ConfigurationSectionName}:PasswordHashHex";
    public const string PasswordSaltConfigurationPath = $"{ConfigurationSectionName}:PasswordSalt";
    public const string DefaultPasswordHashHex =
        "343ec6a8a8fe3f0531834d104d19a220e7aab00705446181236d521f7cbd051b406087dac94ec49eb27bac00d63beaae40f62b973767e906452091294da98609";
    public const string DefaultPasswordSalt = "e1710999510fec1f46b2141d045bb3ea";

    public string PasswordHashHex { get; set; } = DefaultPasswordHashHex;

    public string PasswordSalt { get; set; } = DefaultPasswordSalt;
}
