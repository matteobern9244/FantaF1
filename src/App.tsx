import { startTransition, useEffect, useState } from 'react';
import {
  CalendarDays,
  Flag,
  ListChecks,
  RotateCw,
  ShieldCheck,
  Trash2,
  Trophy,
  User,
} from 'lucide-react';
import './App.css';
import {
  appConfig,
  calendarApiUrl,
  currentYear,
  dataApiUrl,
  driversApiUrl,
  predictionFieldOrder,
  visibleAppTitle,
} from './constants';
import type { AppData, Driver, Prediction, PredictionKey, RaceWeekend, UserData } from './types';
import { getNextUpcomingRace, getRaceByMeetingKey, sortCalendarByRound } from './utils/calendar';
import {
  buildRaceRecord,
  calculatePointsEarned,
  createEmptyPrediction,
  createInitialUsers,
} from './utils/game';
import {
  formatDriverDisplayName,
  getDriverById,
  getDriverDisplayNameById,
  sortDriversBySurname,
} from './utils/drivers';

const { app, driversSource, participants, points, uiText } = appConfig;

const predictionLabels: Record<PredictionKey, string> = {
  first: uiText.labels.winner,
  second: uiText.labels.second,
  third: uiText.labels.third,
  pole: uiText.labels.pole,
};

const resultLabels: Record<PredictionKey, string> = {
  first: uiText.labels.resultFirst,
  second: uiText.labels.resultSecond,
  third: uiText.labels.resultThird,
  pole: uiText.labels.resultPole,
};

function formatText(template: string, replacements: Record<string, string | number>) {
  return Object.entries(replacements).reduce((value, [key, replacement]) => {
    return value.split(`{${key}}`).join(String(replacement));
  }, template);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${response.status}`);
  }

  return response.json() as Promise<T>;
}

function buildEmptyAppData(calendar: RaceWeekend[]): AppData {
  const fallbackRace = getNextUpcomingRace(calendar);

  return {
    users: createInitialUsers(participants),
    history: [],
    gpName: fallbackRace?.grandPrixTitle ?? fallbackRace?.meetingName ?? '',
    raceResults: createEmptyPrediction(),
    selectedMeetingKey: fallbackRace?.meetingKey ?? '',
  };
}

function resolveSelectedRace(calendar: RaceWeekend[], selectedMeetingKey: string): RaceWeekend | null {
  return getRaceByMeetingKey(calendar, selectedMeetingKey) ?? getNextUpcomingRace(calendar);
}

function getNextRaceAfter(calendar: RaceWeekend[], currentRace: RaceWeekend | null): RaceWeekend | null {
  const sortedCalendar = sortCalendarByRound(calendar);

  if (!currentRace) {
    return getNextUpcomingRace(sortedCalendar);
  }

  const currentIndex = sortedCalendar.findIndex(
    (weekend) => weekend.meetingKey === currentRace.meetingKey,
  );

  if (currentIndex >= 0 && currentIndex < sortedCalendar.length - 1) {
    return sortedCalendar[currentIndex + 1];
  }

  return currentRace;
}

function AppLogo() {
  return (
    <svg
      aria-hidden="true"
      className="app-logo"
      viewBox="0 0 220 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logo-red" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e10600" />
        </linearGradient>
      </defs>
      <path d="M10 62L96 18H150L62 62H10Z" fill="url(#logo-red)" />
      <path d="M74 62L162 18H210L122 62H74Z" fill="#e10600" opacity="0.92" />
      <path d="M18 74H120L98 88H0L18 74Z" fill="#ffd166" />
      <path d="M132 74H220L198 88H110L132 74Z" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

function App() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [history, setHistory] = useState<AppData['history']>([]);
  const [gpName, setGpName] = useState('');
  const [raceResults, setRaceResults] = useState<Prediction>(createEmptyPrediction());
  const [selectedMeetingKey, setSelectedMeetingKey] = useState('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [calendar, setCalendar] = useState<RaceWeekend[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [readyToPersist, setReadyToPersist] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadAppState() {
      const [dataResult, driversResult, calendarResult] = await Promise.allSettled([
        fetchJson<AppData>(dataApiUrl),
        fetchJson<Driver[]>(driversApiUrl),
        fetchJson<RaceWeekend[]>(calendarApiUrl),
      ]);

      if (isCancelled) {
        return;
      }

      const loadedDrivers =
        driversResult.status === 'fulfilled' ? driversResult.value : [];
      const loadedCalendar =
        calendarResult.status === 'fulfilled'
          ? sortCalendarByRound(calendarResult.value)
          : [];
      const fallbackData = buildEmptyAppData(loadedCalendar);
      const incomingData = dataResult.status === 'fulfilled' ? dataResult.value : fallbackData;
      const selectedRace =
        resolveSelectedRace(loadedCalendar, incomingData.selectedMeetingKey) ??
        getNextUpcomingRace(loadedCalendar);

      startTransition(() => {
        setDrivers(loadedDrivers);
        setCalendar(loadedCalendar);
        setUsers(incomingData.users);
        setHistory(incomingData.history);
        setRaceResults(incomingData.raceResults);
        setSelectedMeetingKey(selectedRace?.meetingKey ?? fallbackData.selectedMeetingKey);
        setGpName(selectedRace?.grandPrixTitle ?? fallbackData.gpName);

        if (driversResult.status === 'rejected' || calendarResult.status === 'rejected') {
          setLoadError(uiText.loadError);
          if (driversResult.status === 'rejected') {
            console.error(driversResult.reason);
          }

          if (calendarResult.status === 'rejected') {
            console.error(calendarResult.reason);
          }
        } else {
          setLoadError('');
        }

        if (dataResult.status === 'rejected') {
          console.error(dataResult.reason);
        }

        setLoading(false);
        setReadyToPersist(
          driversResult.status === 'fulfilled' && calendarResult.status === 'fulfilled',
        );
      });
    }

    void loadAppState();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!readyToPersist) {
      return;
    }

    const payload: AppData = {
      users,
      history,
      gpName,
      raceResults,
      selectedMeetingKey,
    };

    void fetch(dataApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.error(error);
    });
  }, [gpName, history, raceResults, readyToPersist, selectedMeetingKey, users]);

  const sortedDrivers = sortDriversBySurname(drivers, driversSource.sortLocale);
  const sortedCalendar = sortCalendarByRound(calendar);
  const selectedRace = resolveSelectedRace(sortedCalendar, selectedMeetingKey);
  const nextUpcomingRace = getNextUpcomingRace(sortedCalendar);
  const liveLeaderboardUsers = [...users].sort(
    (firstUser, secondUser) =>
      secondUser.points +
      calculatePointsEarned(secondUser.predictions, raceResults, points) -
      (firstUser.points + calculatePointsEarned(firstUser.predictions, raceResults, points)),
  );

  function calculatePotentialPoints(userPrediction: Prediction) {
    return calculatePointsEarned(userPrediction, raceResults, points);
  }

  function handleRaceSelection(nextMeetingKey: string) {
    const nextRace = getRaceByMeetingKey(sortedCalendar, nextMeetingKey);
    setSelectedMeetingKey(nextRace?.meetingKey ?? '');
    setGpName(nextRace?.grandPrixTitle ?? nextRace?.meetingName ?? '');
    setRaceResults(createEmptyPrediction());
  }

  function updatePrediction(userName: string, field: PredictionKey, value: string) {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.name === userName
          ? { ...user, predictions: { ...user.predictions, [field]: value } }
          : user,
      ),
    );
  }

  function updateRaceResult(field: PredictionKey, value: string) {
    setRaceResults((currentResults) => ({
      ...currentResults,
      [field]: value,
    }));
  }

  function clearAllPredictions() {
    if (!window.confirm(uiText.alerts.clearConfirm)) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) => ({
        ...user,
        predictions: createEmptyPrediction(),
      })),
    );
    setRaceResults(createEmptyPrediction());
  }

  function calculateAndApplyPoints() {
    if (!selectedRace) {
      window.alert(uiText.alerts.missingRace);
      return;
    }

    const hasAllResults = predictionFieldOrder.every((field) => Boolean(raceResults[field]));
    if (!hasAllResults) {
      window.alert(uiText.alerts.missingResults);
      return;
    }

    const { record, updatedUsers } = buildRaceRecord(
      selectedRace.grandPrixTitle || selectedRace.meetingName,
      raceResults,
      users,
      points,
      () => new Date().toLocaleDateString(),
    );

    const clearedUsers = updatedUsers.map((user) => ({
      ...user,
      predictions: createEmptyPrediction(),
    }));
    const nextRace = getNextRaceAfter(sortedCalendar, selectedRace);

    setUsers(clearedUsers);
    setHistory((currentHistory) => [record, ...currentHistory]);
    setSelectedMeetingKey(nextRace?.meetingKey ?? selectedRace.meetingKey);
    setGpName(nextRace?.grandPrixTitle ?? nextRace?.meetingName ?? '');
    setRaceResults(createEmptyPrediction());
    window.alert(
      formatText(uiText.alerts.raceSaved, {
        gpName: record.gpName,
      }),
    );
  }

  function renderHistoryResults(record: AppData['history'][number]) {
    return formatText(uiText.history.resultSummaryTemplate, {
      actualLabel: uiText.history.actualLabel,
      first: getDriverDisplayNameById(drivers, record.results.first, uiText.history.unknownDriver),
      second: getDriverDisplayNameById(drivers, record.results.second, uiText.history.unknownDriver),
      third: getDriverDisplayNameById(drivers, record.results.third, uiText.history.unknownDriver),
      pole: getDriverDisplayNameById(drivers, record.results.pole, uiText.history.unknownDriver),
    });
  }

  if (loading) {
    return (
      <div className="loading-shell">
        <RotateCw className="spin" size={44} />
        <span>{uiText.loading}</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="loading-shell">
        <ShieldCheck size={44} />
        <span>{loadError}</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header
        className="hero-panel"
        style={
          selectedRace?.heroImageUrl
            ? {
                backgroundImage: `linear-gradient(145deg, rgba(10, 11, 19, 0.95), rgba(10, 11, 19, 0.55)), url(${selectedRace.heroImageUrl})`,
              }
            : undefined
        }
      >
        <div className="hero-brand">
          <AppLogo />
          <p className="eyebrow">{uiText.headings.seasonTag}</p>
          <h1>{visibleAppTitle}</h1>
          <p className="subtitle">{currentYear}</p>
        </div>

        <div className="hero-summary-grid">
          <section className="hero-card rules-panel">
            <div className="card-heading">
              <ShieldCheck size={18} />
              <span>{uiText.headings.rules}</span>
            </div>
            <div className="rules-list">
              {predictionFieldOrder.map((field) => (
                <div key={`hero-rule-${field}`} className="rule-row">
                  <span className="rule-points">
                    +{points[field]} {uiText.pointsSuffix}
                  </span>
                  <span>{uiText.rules[field]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="hero-card next-race-card">
            <div className="card-heading">
              <CalendarDays size={18} />
              <span>{uiText.headings.nextRace}</span>
            </div>
            {nextUpcomingRace ? (
              <>
                <strong>{nextUpcomingRace.grandPrixTitle}</strong>
                <span>{nextUpcomingRace.dateRangeLabel}</span>
                <span>
                  {uiText.labels.calendarRound} {nextUpcomingRace.roundNumber}
                </span>
                <span className={`race-badge ${nextUpcomingRace.isSprintWeekend ? 'sprint' : ''}`}>
                  {nextUpcomingRace.isSprintWeekend
                    ? uiText.calendar.sprintBadge
                    : uiText.calendar.raceBadge}
                </span>
              </>
            ) : (
              <span>{uiText.calendar.empty}</span>
            )}
          </section>

          <section className="hero-card">
            <div className="card-heading">
              <Trophy size={18} />
              <span>{uiText.headings.live}</span>
            </div>
            <div className="live-list">
              {liveLeaderboardUsers.map((user) => (
                <div key={`hero-live-${user.name}`} className="live-row">
                  <span>{user.name}</span>
                  <strong>
                    {user.points + calculatePotentialPoints(user.predictions)} {uiText.pointsSuffix}
                  </strong>
                </div>
              ))}
            </div>
            <p className="sidebar-note">{uiText.history.liveHint}</p>
          </section>

          <section className="hero-card">
            <div className="card-heading">
              <Flag size={18} />
              <span>{selectedRace?.meetingName ?? uiText.labels.selectedRace}</span>
            </div>
            {selectedRace ? (
              <div className="driver-spotlight">
                {predictionFieldOrder.map((field) => {
                  const driver = getDriverById(drivers, raceResults[field]);

                  return (
                    <div key={`hero-spotlight-${field}`} className="spotlight-row">
                      <span>{resultLabels[field]}</span>
                      <strong>
                        {driver
                          ? formatDriverDisplayName(driver.name)
                          : uiText.placeholders.emptyOption}
                      </strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-copy">{uiText.calendar.empty}</p>
            )}
          </section>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="content-column">
          <section className="calendar-panel">
            <div className="section-title">
              <Flag size={20} />
              <h2>{uiText.headings.calendar}</h2>
            </div>
            {sortedCalendar.length === 0 ? (
              <p className="empty-copy">{uiText.calendar.empty}</p>
            ) : (
              <>
                <div className="race-selector">
                  <label htmlFor="meeting-selector">{uiText.labels.selectedRace}</label>
                  <select
                    id="meeting-selector"
                    value={selectedRace?.meetingKey ?? ''}
                    onChange={(event) => handleRaceSelection(event.target.value)}
                  >
                    {sortedCalendar.map((weekend) => (
                      <option key={weekend.meetingKey} value={weekend.meetingKey}>
                        {weekend.roundNumber}. {weekend.grandPrixTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="calendar-strip">
                  {sortedCalendar.map((weekend) => (
                    <button
                      key={weekend.meetingKey}
                      className={`calendar-card ${
                        weekend.meetingKey === selectedRace?.meetingKey ? 'selected' : ''
                      }`}
                      onClick={() => handleRaceSelection(weekend.meetingKey)}
                      type="button"
                    >
                      <span className="calendar-round">
                        {uiText.labels.calendarRound} {weekend.roundNumber}
                      </span>
                      <strong>{weekend.meetingName}</strong>
                      <span>{weekend.dateRangeLabel}</span>
                      <span className={`calendar-badge ${weekend.isSprintWeekend ? 'sprint' : ''}`}>
                        {weekend.isSprintWeekend
                          ? uiText.labels.calendarSprint
                          : uiText.calendar.raceBadge}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div className="section-title">
                <User size={20} />
                <h2>
                  {uiText.headings.predictionEntry} ({uiText.labels.adminPrefix}: {app.adminName})
                </h2>
              </div>
              <button className="secondary-button" onClick={clearAllPredictions} type="button">
                <Trash2 size={16} />
                {uiText.buttons.clear}
              </button>
            </div>

            <div className="predictions-grid">
              {users.map((user) => (
                <article key={user.name} className="user-card">
                  <div className="user-card-head">
                    <h3>{user.name}</h3>
                    <span className="points-preview">
                      {uiText.labels.potential}: {calculatePotentialPoints(user.predictions)}{' '}
                      {uiText.pointsSuffix}
                    </span>
                  </div>

                  {predictionFieldOrder.map((field) => (
                    <div key={`${user.name}-${field}`} className="field-row">
                      <label htmlFor={`${user.name}-${field}`}>
                        {predictionLabels[field]} ({points[field]} {uiText.pointsSuffix})
                      </label>
                      <select
                        id={`${user.name}-${field}`}
                        value={user.predictions[field]}
                        onChange={(event) => updatePrediction(user.name, field, event.target.value)}
                      >
                        <option value="">{uiText.placeholders.driverSelect}</option>
                        {sortedDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {formatDriverDisplayName(driver.name)} ({driver.team})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </section>

          <section className="panel accent-panel">
            <div className="section-title">
              <ListChecks size={20} />
              <h2>{uiText.headings.results}</h2>
            </div>

            {selectedRace ? (
              <div className="selected-race-banner">
                <div>
                  <span className="eyebrow">{uiText.labels.selectedRace}</span>
                  <strong>{selectedRace.grandPrixTitle}</strong>
                  <span>{selectedRace.dateRangeLabel}</span>
                </div>
                {selectedRace.trackOutlineUrl ? (
                  <img
                    alt={selectedRace.meetingName}
                    className="track-map"
                    src={selectedRace.trackOutlineUrl}
                  />
                ) : null}
              </div>
            ) : (
              <p className="empty-copy">{uiText.calendar.empty}</p>
            )}

            <div className="results-grid">
              {predictionFieldOrder.map((field) => (
                <div key={field} className="field-row">
                  <label htmlFor={`result-${field}`}>{resultLabels[field]}</label>
                  <select
                    id={`result-${field}`}
                    value={raceResults[field]}
                    onChange={(event) => updateRaceResult(field, event.target.value)}
                  >
                    <option value="">{uiText.placeholders.emptyOption}</option>
                    {sortedDrivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {formatDriverDisplayName(driver.name)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button className="primary-button" onClick={calculateAndApplyPoints} type="button">
              {uiText.buttons.confirmResults}
            </button>
          </section>

          <section className="panel">
            <div className="section-title">
              <Trophy size={20} />
              <h2>{uiText.headings.history}</h2>
            </div>
            {history.length === 0 ? (
              <p className="empty-copy">{uiText.history.empty}</p>
            ) : (
              <div className="history-stack">
                {history.map((record, index) => (
                  <article key={`${record.gpName}-${record.date}-${index}`} className="history-card">
                    <div className="history-top">
                      <div>
                        <strong>{record.gpName}</strong>
                        <span>{record.date}</span>
                      </div>
                      <span className="history-summary">{renderHistoryResults(record)}</span>
                    </div>

                    <div className="history-grid">
                      {Object.entries(record.userPredictions).map(([name, result]) => {
                        const winnerDriver = getDriverById(drivers, result.prediction.first);

                        return (
                          <div key={name} className="history-user-card">
                            <strong>{name}</strong>
                            <span>
                              {result.pointsEarned} {uiText.pointsSuffix}
                            </span>
                            <small>
                              {winnerDriver
                                ? formatDriverDisplayName(winnerDriver.name)
                                : uiText.history.unknownDriver}
                            </small>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>

      <footer className="app-footer">
        <p>{uiText.footer}</p>
      </footer>
    </div>
  );
}

export default App;
