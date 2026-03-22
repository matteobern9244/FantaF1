/**
 * @vitest-environment jsdom
 */
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../../src/App';

const originalConsoleError = console.error;

export class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  private readonly callback: IntersectionObserverCallback;

  constructor(
    callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  trigger(entries: IntersectionObserverEntry[]) {
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

export function mockMediaMatches(matchesByQuery: Record<string, boolean>) {
  (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation((query) => ({
    matches: matchesByQuery[query] ?? false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  });
}

function setNavigatorStandalone(value: boolean) {
  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    value,
  });
}

export function setupRoadmapDomMocks() {
  MockIntersectionObserver.instances = [];
  vi.spyOn(window, 'setInterval').mockImplementation(() => 1 as unknown as number);
  vi.spyOn(window, 'clearInterval').mockImplementation(() => {});
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation((message?: unknown, ...optionalParams: unknown[]) => {
    if (typeof message === 'string' && message.includes('not wrapped in act')) {
      return;
    }

    originalConsoleError(message, ...optionalParams);
  });
  mockMediaMatches({});
  setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
  setNavigatorStandalone(false);
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  });
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
}

export function cleanupRoadmapDomMocks() {
  vi.restoreAllMocks();
  MockIntersectionObserver.instances = [];
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
}

export function createEmptyPrediction() {
  return {
    first: '',
    second: '',
    third: '',
    pole: '',
  };
}

export function createAppData() {
  return {
    users: [
      {
        name: 'Marco',
        points: 20,
        predictions: { first: 'ver', second: 'lec', third: 'nor', pole: 'pia' },
      },
      {
        name: 'Luca',
        points: 11,
        predictions: { first: 'ham', second: 'ver', third: 'nor', pole: 'lec' },
      },
      {
        name: 'Sara',
        points: 14,
        predictions: { first: 'ver', second: 'lec', third: 'ham', pole: 'pia' },
      },
    ],
    history: [
      {
        gpName: 'Gran Premio di Gran Bretagna',
        meetingKey: 'race-gb',
        date: '05/07/2099',
        results: { first: 'ham', second: 'nor', third: 'ver', pole: 'ham' },
        userPredictions: {
          Marco: {
            prediction: { first: 'ham', second: 'nor', third: 'lec', pole: 'ver' },
            pointsEarned: 9,
          },
          Luca: {
            prediction: { first: 'ham', second: 'nor', third: 'pia', pole: 'ver' },
            pointsEarned: 9,
          },
          Sara: {
            prediction: { first: 'nor', second: 'ham', third: 'lec', pole: 'ver' },
            pointsEarned: 3,
          },
        },
      },
    ],
    gpName: 'Monza',
    raceResults: createEmptyPrediction(),
    selectedMeetingKey: 'race-monza',
    weekendStateByMeetingKey: {
      'race-monza': {
        userPredictions: {
          Marco: { first: 'ver', second: 'lec', third: 'nor', pole: 'pia' },
          Luca: { first: 'ham', second: 'ver', third: 'nor', pole: 'lec' },
          Sara: { first: 'ver', second: 'lec', third: 'ham', pole: 'pia' },
        },
        raceResults: createEmptyPrediction(),
      },
    },
  };
}

export function createDrivers() {
  return [
    { id: 'ver', name: 'Max Verstappen', team: 'Red Bull', color: '#0000ff', avatarUrl: 'https://media.example.com/ver.webp' },
    { id: 'lec', name: 'Charles Leclerc', team: 'Ferrari', color: '#ff0000', avatarUrl: 'https://media.example.com/lec.webp' },
    { id: 'nor', name: 'Lando Norris', team: 'McLaren', color: '#ff8000', avatarUrl: 'https://media.example.com/nor.webp' },
    { id: 'pia', name: 'Oscar Piastri', team: 'McLaren', color: '#ff8000', avatarUrl: 'https://media.example.com/pia.webp' },
    { id: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', color: '#ff0000', avatarUrl: 'https://media.example.com/ham.webp' },
  ];
}

export function createCalendar() {
  return [
    {
      meetingKey: 'race-monza',
      meetingName: 'Monza',
      grandPrixTitle: 'Gran Premio d\'Italia 2099',
      roundNumber: 13,
      dateRangeLabel: '04 - 06 SEP',
      detailUrl: 'https://www.formula1.com/en/racing/2099/italy',
      heroImageUrl: 'https://media.example.com/monza-hero.webp',
      trackOutlineUrl: '',
      isSprintWeekend: false,
      startDate: '2099-09-04',
      endDate: '2099-09-06',
      raceStartTime: '2099-09-06T15:00:00Z',
      sessions: [],
    },
    {
      meetingKey: 'race-gb',
      meetingName: 'Silverstone',
      grandPrixTitle: 'Gran Premio di Gran Bretagna',
      roundNumber: 10,
      dateRangeLabel: '03 - 05 JUL',
      detailUrl: 'https://www.formula1.com/en/racing/2099/great-britain',
      heroImageUrl: 'https://media.example.com/gb-hero.webp',
      trackOutlineUrl: '',
      isSprintWeekend: false,
      startDate: '2099-07-03',
      endDate: '2099-07-05',
      raceStartTime: '2099-07-05T15:00:00Z',
      sessions: [],
    },
  ];
}

export function createStandings() {
  return {
    driverStandings: [
      { position: 1, driverId: 'pia', name: 'Oscar Piastri', team: 'McLaren', points: 99, avatarUrl: 'https://media.example.com/pia.webp', color: '#ff8000' },
      { position: 2, driverId: 'nor', name: 'Lando Norris', team: 'McLaren', points: 89, avatarUrl: 'https://media.example.com/nor.webp', color: '#ff8000' },
      { position: 3, driverId: 'lec', name: 'Charles Leclerc', team: 'Ferrari', points: 71, avatarUrl: 'https://media.example.com/lec.webp', color: '#ff0000' },
    ],
    constructorStandings: [
      { position: 1, team: 'McLaren', points: 188, color: '#ff8000', logoUrl: 'https://media.example.com/mclaren-logo.webp' },
      { position: 2, team: 'Ferrari', points: 144, color: '#ff0000', logoUrl: 'https://media.example.com/ferrari-logo.webp' },
      { position: 3, team: 'Red Bull', points: 121, color: '#0000ff', logoUrl: 'https://media.example.com/red-bull-logo.webp' },
    ],
    updatedAt: '2026-03-12T10:00:00.000Z',
  };
}

export async function renderRoadmapApp(initialEntries: string[]) {
  const view = render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );

  const loader = screen.queryByTestId('pitstop-loader');
  if (loader) {
    await waitForElementToBeRemoved(loader);
  }
  return view;
}

function createResponse(payload: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve(payload),
  } as Response;
}

type SetupFetchOverrides = {
  appData?: ReturnType<typeof createAppData>;
  calendar?: ReturnType<typeof createCalendar>;
  sessionState?: { isAdmin: boolean; defaultViewMode: 'admin' | 'public' };
  resultsByMeetingKey?: Record<string, { racePhase?: 'open' | 'live' | 'finished'; results: ReturnType<typeof createEmptyPrediction> }>;
  standings?: ReturnType<typeof createStandings>;
};

export function setupRoadmapFetch({
  appData = createAppData(),
  calendar = createCalendar(),
  sessionState = { isAdmin: true, defaultViewMode: 'admin' as const },
  resultsByMeetingKey = {
    'race-monza': { racePhase: 'open', results: createEmptyPrediction() },
    'race-gb': { racePhase: 'open', results: createEmptyPrediction() },
  } as Record<string, { racePhase?: 'open' | 'live' | 'finished'; results: ReturnType<typeof createEmptyPrediction> }>,
  standings = createStandings(),
}: SetupFetchOverrides = {}) {
  const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;

  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    if (url.includes('/api/session')) {
      return Promise.resolve(createResponse(sessionState));
    }

    if (url.includes('/api/data') && (!options || options.method !== 'POST')) {
      return Promise.resolve(createResponse(appData));
    }

    if (url.includes('/api/drivers')) {
      return Promise.resolve(createResponse(createDrivers()));
    }

    if (url.includes('/api/calendar')) {
      return Promise.resolve(createResponse(calendar));
    }

    if (url.includes('/api/standings')) {
      return Promise.resolve(createResponse(standings));
    }

    if (url.includes('/api/predictions')) {
      return Promise.resolve(createResponse({ message: 'Dati salvati correttamente.' }));
    }

    const resultsEntry = Object.entries(resultsByMeetingKey).find(([meetingKey]) =>
      url.includes(`/api/results/${meetingKey}`),
    );

    if (resultsEntry) {
      return Promise.resolve(
        createResponse({
          ...resultsEntry[1].results,
          racePhase: resultsEntry[1].racePhase ?? 'open',
        }),
      );
    }

    return Promise.reject(new Error(`Unhandled fetch to ${url}`));
  });

  return fetchMock;
}
