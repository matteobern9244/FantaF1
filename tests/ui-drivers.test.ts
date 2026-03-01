import { describe, expect, it } from 'vitest';
import {
  formatDriverDisplayName,
  getDriverDisplayNameById,
  sortDriversBySurname,
} from '../src/utils/drivers';

describe('UI driver formatting', () => {
  it('formats names as surname followed by given name', () => {
    expect(formatDriverDisplayName('Max Verstappen')).toBe('Verstappen Max');
    expect(formatDriverDisplayName('Lewis Hamilton')).toBe('Hamilton Lewis');
    expect(formatDriverDisplayName('Cher')).toBe('Cher');
  });

  it('sorts drivers by surname for UI lists', () => {
    const sortedDrivers = sortDriversBySurname(
      [
        { id: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', color: '#fff' },
        { id: 'ver', name: 'Max Verstappen', team: 'Red Bull', color: '#fff' },
        { id: 'alb', name: 'Alexander Albon', team: 'Williams', color: '#fff' },
      ],
      'it',
    );

    expect(sortedDrivers.map((driver) => driver.id)).toEqual(['alb', 'ham', 'ver']);
    expect(getDriverDisplayNameById(sortedDrivers, 'ham', '-')).toBe('Hamilton Lewis');
    expect(getDriverDisplayNameById(sortedDrivers, 'unknown', '-')).toBe('-');
  });
});
