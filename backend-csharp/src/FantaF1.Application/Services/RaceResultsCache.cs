using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Services;

public sealed class RaceResultsCache
{
    private readonly TimeSpan _ttl;
    private readonly Func<DateTimeOffset> _nowProvider;
    private readonly Dictionary<string, CacheEntry> _cache = new(StringComparer.Ordinal);
    private readonly object _gate = new();

    public RaceResultsCache(TimeSpan? ttl = null, Func<DateTimeOffset>? nowProvider = null)
    {
        _ttl = ttl ?? TimeSpan.FromSeconds(30);
        _nowProvider = nowProvider ?? (() => DateTimeOffset.UtcNow);
    }

    public PredictionDocument? Get(string meetingKey)
    {
        lock (_gate)
        {
            if (!_cache.TryGetValue(meetingKey, out var entry))
            {
                return null;
            }

            if (_nowProvider() - entry.StoredAt > _ttl)
            {
                _cache.Remove(meetingKey);
                return null;
            }

            return Clone(entry.Results);
        }
    }

    public PredictionDocument Set(string meetingKey, PredictionDocument results)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(meetingKey);
        ArgumentNullException.ThrowIfNull(results);

        lock (_gate)
        {
            _cache[meetingKey] = new CacheEntry(_nowProvider(), Clone(results));
            return Clone(results);
        }
    }

    public void Clear()
    {
        lock (_gate)
        {
            _cache.Clear();
        }
    }

    private static PredictionDocument Clone(PredictionDocument results)
    {
        return new PredictionDocument(results.First, results.Second, results.Third, results.Pole);
    }

    private sealed record CacheEntry(DateTimeOffset StoredAt, PredictionDocument Results);
}
