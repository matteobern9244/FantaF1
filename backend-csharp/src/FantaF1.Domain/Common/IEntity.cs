namespace FantaF1.Domain.Common;

public interface IEntity<out TId>
{
    TId Id { get; }
}
