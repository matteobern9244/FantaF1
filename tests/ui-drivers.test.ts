import { describe, expect, it } from 'vitest';
import {
  formatDriverDisplayName,
  getDriverDisplayNameById,
  sortDriversBySurname,
  sortDriversAlphabetically,
  getDriverNameById,
  getDriverById,
} from '../src/utils/drivers';

describe('UI driver formatting', () => {
  it('formats names as surname followed by given name', () => {
    expect(formatDriverDisplayName('Max Verstappen')).toBe('Verstappen Max');
    expect(formatDriverDisplayName('Lewis Hamilton')).toBe('Hamilton Lewis');
    expect(formatDriverDisplayName('Cher')).toBe('Cher');
    expect(formatDriverDisplayName(undefined as unknown as string)).toBe('');
    expect(formatDriverDisplayName('   ')).toBe('');
  });

  it('sorts drivers by surname for UI lists', () => {
    const sortedDrivers = sortDriversBySurname(
      [
        { id: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', color: '#fff' },
        { id: 'm-sch', name: 'Michael Schumacher', team: 'Ferrari', color: '#fff' },
        { id: 'r-sch', name: 'Ralf Schumacher', team: 'Williams', color: '#fff' },
        { id: 'ver', name: 'Max Verstappen', team: 'Red Bull', color: '#fff' },
        { id: 'alb', name: 'Alexander Albon', team: 'Williams', color: '#fff' },
      ],
      'it',
    );

    expect(sortedDrivers.map((driver) => driver.id)).toEqual(['alb', 'ham', 'm-sch', 'r-sch', 'ver']);
    expect(getDriverDisplayNameById(sortedDrivers, 'ham', '-')).toBe('Hamilton Lewis');
    expect(getDriverDisplayNameById(sortedDrivers, 'unknown', '-')).toBe('-');
  });

  it('sorts drivers alphabetically by full name', () => {
    const sortedDrivers = sortDriversAlphabetically(
      [
        { id: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', color: '#fff' },
        { id: 'ver', name: 'Max Verstappen', team: 'Red Bull', color: '#fff' },
        { id: 'alb', name: 'Alexander Albon', team: 'Williams', color: '#fff' },
      ],
      'it',
    );
    expect(sortedDrivers.map((driver) => driver.id)).toEqual(['alb', 'ham', 'ver']);
  });

  it('gets driver by id', () => {
    const drivers = [{ id: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', color: '#fff' }];
    expect(getDriverById(drivers, 'ham')?.name).toBe('Lewis Hamilton');
    expect(getDriverById(drivers, 'unknown')).toBeNull();
  });

  it('gets driver name by id with fallback', () => {
    const drivers = [{ id: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', color: '#fff' }];
    expect(getDriverNameById(drivers, 'ham', 'Unknown')).toBe('Lewis Hamilton');
    expect(getDriverNameById(drivers, 'ver', 'Unknown')).toBe('Unknown');
  });
});
