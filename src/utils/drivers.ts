import type { Driver } from '../types';

function splitDriverName(name: string) {
  const normalizedParts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (normalizedParts.length <= 1) {
    return {
      givenNames: normalizedParts.join(' '),
      surname: '',
    };
  }

  return {
    givenNames: normalizedParts.slice(0, -1).join(' '),
    surname: normalizedParts[normalizedParts.length - 1] ?? '',
  };
}

export function formatDriverDisplayName(name: string): string {
  const { givenNames, surname } = splitDriverName(name);

  if (!surname) {
    return givenNames;
  }

  return `${surname} ${givenNames}`.trim();
}

export function sortDriversBySurname(drivers: Driver[], locale: string): Driver[] {
  return [...drivers].sort((firstDriver, secondDriver) => {
    const firstNameParts = splitDriverName(firstDriver.name);
    const secondNameParts = splitDriverName(secondDriver.name);
    const surnameDelta = firstNameParts.surname.localeCompare(secondNameParts.surname, locale, {
      sensitivity: 'base',
    });

    if (surnameDelta !== 0) {
      return surnameDelta;
    }

    return firstNameParts.givenNames.localeCompare(secondNameParts.givenNames, locale, {
      sensitivity: 'base',
    });
  });
}

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

export function getDriverDisplayNameById(
  drivers: Driver[],
  driverId: string,
  fallbackValue: string,
): string {
  const resolvedName = getDriverById(drivers, driverId)?.name;
  return resolvedName ? formatDriverDisplayName(resolvedName) : fallbackValue;
}
