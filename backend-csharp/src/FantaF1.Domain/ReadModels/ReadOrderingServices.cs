using System.Globalization;

namespace FantaF1.Domain.ReadModels;

public sealed class DriverOrderingService
{
    private static readonly CompareInfo CompareInfo = CultureInfo.GetCultureInfo("it").CompareInfo;

    public IReadOnlyList<DriverDocument> Order(IReadOnlyList<DriverDocument> drivers)
    {
        return drivers
            .OrderBy(driver => driver, DriverNameComparer.Instance)
            .ToArray();
    }

    private sealed class DriverNameComparer : IComparer<DriverDocument>
    {
        public static DriverNameComparer Instance { get; } = new();

        public int Compare(DriverDocument? firstDriver, DriverDocument? secondDriver)
        {
            if (ReferenceEquals(firstDriver, secondDriver))
            {
                return 0;
            }

            if (firstDriver is null)
            {
                return -1;
            }

            if (secondDriver is null)
            {
                return 1;
            }

            return CompareInfo.Compare(
                firstDriver.Name,
                secondDriver.Name,
                CompareOptions.IgnoreCase | CompareOptions.IgnoreNonSpace);
        }
    }
}

public sealed class CalendarOrderingService
{
    public IReadOnlyList<WeekendDocument> Order(IReadOnlyList<WeekendDocument> weekends)
    {
        return weekends
            .OrderBy(weekend => weekend, WeekendRoundComparer.Instance)
            .ToArray();
    }

    private sealed class WeekendRoundComparer : IComparer<WeekendDocument>
    {
        public static WeekendRoundComparer Instance { get; } = new();

        public int Compare(WeekendDocument? firstWeekend, WeekendDocument? secondWeekend)
        {
            if (ReferenceEquals(firstWeekend, secondWeekend))
            {
                return 0;
            }

            if (firstWeekend is null)
            {
                return -1;
            }

            if (secondWeekend is null)
            {
                return 1;
            }

            return firstWeekend.RoundNumber.HasValue
                && secondWeekend.RoundNumber.HasValue
                && firstWeekend.RoundNumber.Value != secondWeekend.RoundNumber.Value
                    ? firstWeekend.RoundNumber.Value - secondWeekend.RoundNumber.Value
                    : 0;
        }
    }
}
