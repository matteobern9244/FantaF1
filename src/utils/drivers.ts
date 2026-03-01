import type { Driver } from '../types';

export function sortDriversAlphabetically(drivers: Driver[], locale: string): Driver[] {
  return [...drivers].sort((firstDriver, secondDriver) =>
    firstDriver.name.localeCompare(secondDriver.name, locale, {
      sensitivity: 'base',
    }),
  );
}

export function getDriverById(drivers: Driver[], driverId: string): Driver | null {
  return drivers.find((driver) => driver.id === driverId) ?? null;
}

export function getDriverNameById(
  drivers: Driver[],
  driverId: string,
  fallbackValue: string,
): string {
  return getDriverById(drivers, driverId)?.name ?? fallbackValue;
}
