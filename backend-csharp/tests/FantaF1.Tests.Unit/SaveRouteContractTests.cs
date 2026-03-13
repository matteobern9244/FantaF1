using FantaF1.Application.Abstractions.Services;

namespace FantaF1.Tests.Unit;

public sealed class SaveRouteContractTests
{
    [Fact]
    public void Build_save_error_payload_includes_details_outside_production_and_hides_them_in_production()
    {
        var developmentPayload = SaveRouteContract.BuildSaveErrorPayload(
            environment: "development",
            requestId: "req-dev",
            code: SaveRouteContract.StorageWriteFailedCode,
            error: SaveRouteContract.SaveFailedError,
            details: "mongo write failed");
        var productionPayload = SaveRouteContract.BuildSaveErrorPayload(
            environment: "production",
            requestId: "req-prod",
            code: SaveRouteContract.SaveUnexpectedErrorCode,
            error: SaveRouteContract.SaveFailedError,
            details: "hidden");

        Assert.Equal("mongo write failed", developmentPayload.Details);
        Assert.Equal("req-dev", developmentPayload.RequestId);
        Assert.Null(productionPayload.Details);
        Assert.Equal("req-prod", productionPayload.RequestId);
    }

    [Fact]
    public void Save_route_contract_builds_success_and_admin_required_outcomes()
    {
        var successOutcome = SaveRouteContract.CreateSuccess();
        var adminRequiredOutcome = SaveRouteContract.CreateAdminRequiredError();

        Assert.Equal(SaveRouteContract.SaveSuccessMessage, successOutcome.Payload.Message);
        Assert.Equal(SaveRouteContract.UnauthorizedStatusCode, adminRequiredOutcome.StatusCode);
        Assert.Equal(SaveRouteContract.AdminAuthRequiredCode, adminRequiredOutcome.Payload.Code);
        Assert.Null(adminRequiredOutcome.Payload.RequestId);
    }

    [Fact]
    public void Classify_save_error_matches_the_node_compatible_codes()
    {
        Assert.Equal(
            SaveRouteContract.ParticipantsInvalidCode,
            SaveRouteContract.ClassifySaveError(new InvalidOperationException("Invalid participants list. Expected 3 participants.")));
        Assert.Equal(
            SaveRouteContract.PredictionsMissingCode,
            SaveRouteContract.ClassifySaveError(new InvalidOperationException("At least one prediction is required for manual predictions save.")));
        Assert.Equal(
            SaveRouteContract.RaceLockedCode,
            SaveRouteContract.ClassifySaveError(new InvalidOperationException("I pronostici sono bloccati.")));
        Assert.Equal(
            SaveRouteContract.DatabaseTargetMismatchCode,
            SaveRouteContract.ClassifySaveError(new InvalidOperationException("MONGODB_URI targets \"fantaf1\" but development requires \"fantaf1_porting\".")));
        Assert.Equal(
            SaveRouteContract.StorageWriteFailedCode,
            SaveRouteContract.ClassifySaveError(new InvalidOperationException("Mongo write failed")));
        Assert.Equal(
            SaveRouteContract.SaveUnexpectedErrorCode,
            SaveRouteContract.ClassifySaveError(new InvalidOperationException("Completely unexpected")));
    }

    [Fact]
    public void Create_validation_error_preserves_the_expected_status_code_and_payload_shape()
    {
        var outcome = SaveRouteContract.CreateValidationError(
            environment: "development",
            requestId: "req-123",
            code: SaveRouteContract.PredictionsMissingCode,
            error: SaveRouteContract.MissingPredictionsError,
            details: SaveRouteContract.PredictionsMissingDetails);

        var errorOutcome = Assert.IsType<SaveErrorOutcome>(outcome);

        Assert.Equal(SaveRouteContract.BadRequestStatusCode, errorOutcome.StatusCode);
        Assert.Equal(SaveRouteContract.PredictionsMissingCode, errorOutcome.Payload.Code);
        Assert.Equal("req-123", errorOutcome.Payload.RequestId);
        Assert.Equal(SaveRouteContract.PredictionsMissingDetails, errorOutcome.Payload.Details);
    }

    [Fact]
    public void Save_route_contract_formats_templates_and_supports_the_default_status_code()
    {
        var formattedValue = SaveRouteContract.FormatTemplate(
            SaveRouteContract.ParticipantsInvalidDetailsTemplate,
            ("participantSlots", 3),
            ("received", "unknown"));
        var untouchedTemplate = SaveRouteContract.FormatTemplate("No replacements");
        var nullReplacementTemplate = SaveRouteContract.FormatTemplate("Value {value}", ("value", new NullStringConvertible()));
        var unmatchedReplacementTemplate = SaveRouteContract.FormatTemplate("Value {value}", ("missing", "x"));

        Assert.Equal("Expected 3 participants, received unknown.", formattedValue);
        Assert.Equal("No replacements", untouchedTemplate);
        Assert.Equal("Value ", nullReplacementTemplate);
        Assert.Equal("Value {value}", unmatchedReplacementTemplate);
        Assert.Equal(SaveRouteContract.UnauthorizedStatusCode, SaveRouteContract.ResolveStatusCode(SaveRouteContract.AdminAuthRequiredCode));
        Assert.Equal(SaveRouteContract.BadRequestStatusCode, SaveRouteContract.ResolveStatusCode(SaveRouteContract.ParticipantsInvalidCode));
        Assert.Equal(SaveRouteContract.BadRequestStatusCode, SaveRouteContract.ResolveStatusCode(SaveRouteContract.PredictionsMissingCode));
        Assert.Equal(SaveRouteContract.ForbiddenStatusCode, SaveRouteContract.ResolveStatusCode(SaveRouteContract.RaceLockedCode));
        Assert.Equal(SaveRouteContract.InternalServerErrorStatusCode, SaveRouteContract.ResolveStatusCode("not_mapped"));
    }
}

sealed class NullStringConvertible : IConvertible
{
    public TypeCode GetTypeCode() => TypeCode.Object;
    public bool ToBoolean(IFormatProvider? provider) => throw new NotSupportedException();
    public byte ToByte(IFormatProvider? provider) => throw new NotSupportedException();
    public char ToChar(IFormatProvider? provider) => throw new NotSupportedException();
    public DateTime ToDateTime(IFormatProvider? provider) => throw new NotSupportedException();
    public decimal ToDecimal(IFormatProvider? provider) => throw new NotSupportedException();
    public double ToDouble(IFormatProvider? provider) => throw new NotSupportedException();
    public short ToInt16(IFormatProvider? provider) => throw new NotSupportedException();
    public int ToInt32(IFormatProvider? provider) => throw new NotSupportedException();
    public long ToInt64(IFormatProvider? provider) => throw new NotSupportedException();
    public sbyte ToSByte(IFormatProvider? provider) => throw new NotSupportedException();
    public float ToSingle(IFormatProvider? provider) => throw new NotSupportedException();
    public string ToString(IFormatProvider? provider) => null!;
    public object ToType(Type conversionType, IFormatProvider? provider) => throw new NotSupportedException();
    public ushort ToUInt16(IFormatProvider? provider) => throw new NotSupportedException();
    public uint ToUInt32(IFormatProvider? provider) => throw new NotSupportedException();
    public ulong ToUInt64(IFormatProvider? provider) => throw new NotSupportedException();
}
