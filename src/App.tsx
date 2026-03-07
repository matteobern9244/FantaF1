import pitstopIcon from './assets/pitstop.png';
import tireIcon from './assets/tire.png';
import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Flag,
  ListChecks,
  ShieldCheck,
  Save,
  Trash2,
  Trophy,
  User,
  Timer,
  Zap,
  FastForward,
  Gauge,
} from 'lucide-react';
import './App.css';
import {
  appConfig,
  appVersion,
  calendarApiUrl,
  currentYear,
  dataApiUrl,
  driversApiUrl,
  genericAppTitle,
  predictionsApiUrl,
  predictionFieldOrder,
  visibleAppTitle,
} from './constants';
import {
  buildEmptyAppData,
  fetchWithRetry,
  formatText,
  getNextRaceAfter,
  getOfficialResultsAvailability,
  hasPredictionValue,
  isRaceFinished,
  isRaceStarted,
  isWeekendActive,
  normalizeMeetingName,
  resolveSelectedRace,
} from './utils/appHelpers';
import type {
  AppData,
  Driver,
  Prediction,
  PredictionKey,
  RaceWeekend,
  UserData,
  WeekendStateByMeetingKey,
} from './types';
import {
  formatSessionTimeParts,
  getNextUpcomingRace,
  getRaceByMeetingKey,
  sortCalendarByRound,
  translateSessionName,
} from './utils/calendar';
import {
  buildRaceRecord,
  calculateLiveTotal,
  calculateProjectedPoints,
  createEmptyPrediction,
  mergeMissingPredictionFields,
  rebuildUsersFromHistory,
  sortUsersByLiveTotal,
  validatePredictions,
} from './utils/game';
import {
  formatDriverDisplayName,
  getDriverById,
  getDriverDisplayNameById,
  sortDriversBySurname,
} from './utils/drivers';
import { createSaveRequestError, getSaveErrorAlertMessage } from './utils/save';
import { splitHeroTitle } from './utils/title';
import {
  getWeekendPredictionState,
  hydrateAppDataForWeekend,
  hydrateUsersForWeekend,
  normalizeWeekendStateByMeetingKey,
  upsertWeekendPredictionState,
  upsertWeekendRaceResults,
} from './utils/weekendState';

const { driversSource, points, uiText } = appConfig;

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

const heroTitle = splitHeroTitle(visibleAppTitle, genericAppTitle);
/* v8 ignore next -- runtime environment branch depends on bundler mode */
const saveRuntimeEnvironment = import.meta.env.DEV ? 'development' : 'production';

/* v8 ignore next -- static SVG exercised by integration and browser smoke tests */
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

/* v8 ignore start -- icon mapping is presentation-only and exercised via rendered sessions */
function SessionIcon({ name, size = 14 }: { name: string; size?: number }) {
  const n = name.toLowerCase();
  if (n.includes('practice')) return <Timer size={size} />;
  if (n.includes('qualifying') || n.includes('shootout')) return <Zap size={size} />;
  if (n.includes('sprint')) return <FastForward size={size} />;
  if (n.includes('race')) return <Flag size={size} />;
  return <Gauge size={size} />;
}
/* v8 ignore stop */

/* v8 ignore start -- stateful UI shell is exercised through RTL and browser smoke tests */
function App() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [history, setHistory] = useState<AppData['history']>([]);
  const [gpName, setGpName] = useState('');
  const [raceResults, setRaceResults] = useState<Prediction>(createEmptyPrediction());
  const [selectedMeetingKey, setSelectedMeetingKey] = useState('');
  const [weekendStateByMeetingKey, setWeekendStateByMeetingKey] = useState<WeekendStateByMeetingKey>(
    {},
  );
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [calendar, setCalendar] = useState<RaceWeekend[]>([]);
  const [editingSession, setEditingSession] = useState<{
    record: AppData['history'][number];
    historyIndex: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Preparazione dei box...');
  const [loadError, setLoadError] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const selectedMeetingKeyRef = useRef(selectedMeetingKey);

  // Derived state (declared before effects to avoid TS errors)
  const sortedDrivers = sortDriversBySurname(drivers, driversSource.sortLocale);
  const sortedCalendar = sortCalendarByRound(calendar);
  const selectedRace = resolveSelectedRace(sortedCalendar, selectedMeetingKey);
  const nextUpcomingRace = getNextUpcomingRace(sortedCalendar);
  const allLiveResultsFilled = predictionFieldOrder.every((field) => hasPredictionValue(raceResults[field]));
  const shouldShowOfficialResultsStatus = Boolean(selectedRace) && !editingSession;
  const officialResultsAvailability = shouldShowOfficialResultsStatus
    ? getOfficialResultsAvailability(raceResults)
    : null;
  const liveResultsStatusMessage =
    officialResultsAvailability === 'none'
      ? uiText.status.liveNoOfficialResults
      : officialResultsAvailability === 'partial'
        ? uiText.status.livePartialOfficialResults
        : '';
  const predictionResultsStatusMessage =
    officialResultsAvailability === 'none'
      ? uiText.status.predictionNoOfficialResults
      : officialResultsAvailability === 'partial'
        ? uiText.status.predictionPartialOfficialResults
        : '';

  useEffect(() => {
    selectedMeetingKeyRef.current = selectedMeetingKey;
  }, [selectedMeetingKey]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAppState() {
      setLoadingMessage('Sincronizzazione telemetria e piloti in corso...');
      const [dataResult, driversResult, calendarResult] = await Promise.allSettled([
        fetchWithRetry<AppData>(dataApiUrl),
        fetchWithRetry<Driver[]>(driversApiUrl),
        fetchWithRetry<RaceWeekend[]>(calendarApiUrl),
      ]);

      if (isCancelled) {
        return;
      }

      setLoadingMessage('Configurazione assetto weekend...');

      const loadedDrivers =
        driversResult.status === 'fulfilled' ? driversResult.value : [];
      const loadedCalendar =
        calendarResult.status === 'fulfilled'
          ? sortCalendarByRound(calendarResult.value)
          : [];
      const fallbackData = buildEmptyAppData(loadedCalendar);
      const incomingData = dataResult.status === 'fulfilled' ? dataResult.value : fallbackData;
      const resolvedRace =
        resolveSelectedRace(loadedCalendar, incomingData.selectedMeetingKey) ??
        getNextUpcomingRace(loadedCalendar);
      const resolvedMeetingKey = resolvedRace?.meetingKey ?? fallbackData.selectedMeetingKey;
      const initialWeekendStateByMeetingKey = resolvedMeetingKey
        ? upsertWeekendPredictionState(
            normalizeWeekendStateByMeetingKey(incomingData.weekendStateByMeetingKey),
            resolvedMeetingKey,
            incomingData.users,
            incomingData.raceResults,
          )
        : normalizeWeekendStateByMeetingKey(incomingData.weekendStateByMeetingKey);
      const hydratedIncomingData = resolvedMeetingKey
        ? hydrateAppDataForWeekend(
            {
              ...incomingData,
              selectedMeetingKey: resolvedMeetingKey,
              weekendStateByMeetingKey: initialWeekendStateByMeetingKey,
            },
            resolvedMeetingKey,
          )
        : {
            ...incomingData,
            weekendStateByMeetingKey: initialWeekendStateByMeetingKey,
          };

      setDrivers(loadedDrivers);
      setCalendar(loadedCalendar);
      setUsers(hydratedIncomingData.users);
      setHistory(hydratedIncomingData.history);
      setRaceResults(hydratedIncomingData.raceResults);
      setWeekendStateByMeetingKey(initialWeekendStateByMeetingKey);
      setSelectedMeetingKey(resolvedMeetingKey);
      setGpName(resolvedRace?.grandPrixTitle ?? fallbackData.gpName);

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
    }

    void loadAppState();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedRace || editingSession || allLiveResultsFilled) {
      return;
    }

    const activeRace = selectedRace;
    let isCancelled = false;
    let pollingId: number | null = null;

    async function syncSelectedWeekendResults() {
      try {
        const response = await fetch(`/api/results/${activeRace.meetingKey}`);
        if (!response.ok) {
          return;
        }
        const results = await response.json() as Prediction;
        if (isCancelled) {
          return;
        }

        if (selectedMeetingKeyRef.current !== activeRace.meetingKey) {
          return;
        }

        setRaceResults((currentResults) => mergeMissingPredictionFields(currentResults, results));
        setWeekendStateByMeetingKey((currentWeekendStateByMeetingKey) => {
          const currentWeekendState = getWeekendPredictionState(
            currentWeekendStateByMeetingKey,
            activeRace.meetingKey,
          );
          const mergedResults = mergeMissingPredictionFields(currentWeekendState.raceResults, results);

          if (mergedResults === currentWeekendState.raceResults) {
            return currentWeekendStateByMeetingKey;
          }

          return upsertWeekendRaceResults(
            currentWeekendStateByMeetingKey,
            activeRace.meetingKey,
            mergedResults,
          );
        });
      } catch (error) {
        console.error('Failed to auto-fetch results:', error);
      }
    }

    void syncSelectedWeekendResults();

    if (isWeekendActive(activeRace)) {
      pollingId = window.setInterval(() => {
        void syncSelectedWeekendResults();
      }, 30_000);
    }

    return () => {
      isCancelled = true;
      if (pollingId !== null) {
        window.clearInterval(pollingId);
      }
    };
  }, [
    allLiveResultsFilled,
    editingSession,
    selectedRace,
  ]);

  const liveLeaderboardUsers = sortUsersByLiveTotal(users, raceResults, points);

  function calculatePotentialPoints(userPrediction: Prediction) {
    return calculateProjectedPoints(userPrediction, raceResults, points);
  }

  function mergePredictionsIntoUsers(nextUsers: UserData[], sourceUsers: UserData[]) {
    return nextUsers.map((nextUser) => {
      const sourceUser = sourceUsers.find((user) => user.name === nextUser.name);

      return sourceUser
        ? {
            ...nextUser,
            predictions: { ...sourceUser.predictions },
          }
        : nextUser;
    });
  }

  function hydrateSelectedWeekendView(nextMeetingKey: string, baseUsers: UserData[]) {
    const selectedWeekendState = getWeekendPredictionState(weekendStateByMeetingKey, nextMeetingKey);

    return {
      users: hydrateUsersForWeekend(baseUsers, selectedWeekendState),
      raceResults: selectedWeekendState.raceResults,
    };
  }

  function resolveRaceFromRecord(record: AppData['history'][number]) {
    if (record.meetingKey) {
      const directMatch = getRaceByMeetingKey(sortedCalendar, record.meetingKey);
      if (directMatch) {
        return directMatch;
      }
    }

    const normalizedRecordName = normalizeMeetingName(record.gpName);
    if (normalizedRecordName) {
      const matchedRace = sortedCalendar.find((weekend) => {
        return (
          normalizeMeetingName(weekend.grandPrixTitle) === normalizedRecordName ||
          normalizeMeetingName(weekend.meetingName) === normalizedRecordName
        );
      });

      if (matchedRace) {
        return matchedRace;
      }
    }

    return selectedRace ?? getNextUpcomingRace(sortedCalendar);
  }

  async function persistAppData(updatedState?: Partial<AppData>, targetUrl = dataApiUrl) {
    const payloadBase: AppData = {
      users,
      history,
      gpName,
      raceResults,
      selectedMeetingKey,
      weekendStateByMeetingKey,
      ...updatedState,
    };
    const payload: AppData = editingSession
      ? {
          ...payloadBase,
          weekendStateByMeetingKey: normalizeWeekendStateByMeetingKey(
            payloadBase.weekendStateByMeetingKey,
          ),
        }
      : {
          ...payloadBase,
          weekendStateByMeetingKey: upsertWeekendPredictionState(
            normalizeWeekendStateByMeetingKey(payloadBase.weekendStateByMeetingKey),
            payloadBase.selectedMeetingKey,
            payloadBase.users,
            payloadBase.raceResults,
          ),
        };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw await createSaveRequestError(response, {
        fallbackMessage: uiText.backend.errors.saveFailed,
        environment: saveRuntimeEnvironment,
      });
    }
  }

  function handleSaveFailure(context: string, error: unknown) {
    console.error(context, error);
    window.alert(
      getSaveErrorAlertMessage({
        error,
        fallbackMessage: uiText.backend.errors.saveFailed,
        environment: saveRuntimeEnvironment,
      }),
    );
  }

  async function handleSavePredictions() {
    if (editingSession) {
      return;
    }

    const isValid = validatePredictions(users, predictionFieldOrder);

    if (!isValid) {
      window.alert(uiText.alerts.missingPredictions);
      return;
    }

    try {
      await persistAppData(undefined, predictionsApiUrl);
      window.alert(appConfig.uiText.backend.messages.saveSuccess);
    } catch (error) {
      handleSaveFailure('Save error:', error);
    }
  }

  function handleRaceSelection(nextMeetingKey: string) {
    if (editingSession) {
      return;
    }

    const nextRace = getRaceByMeetingKey(sortedCalendar, nextMeetingKey);
    const nextMeeting = nextRace?.meetingKey ?? '';
    const nextWeekendView = hydrateSelectedWeekendView(nextMeeting, users);

    setSelectedMeetingKey(nextMeeting);
    setGpName(nextRace?.grandPrixTitle ?? nextRace?.meetingName ?? '');
    setUsers(nextWeekendView.users);
    setRaceResults(nextWeekendView.raceResults);
  }

  function updatePrediction(userName: string, field: PredictionKey, value: string) {
    setUsers((currentUsers) => {
      const updatedUsers = currentUsers.map((user) =>
        user.name === userName
          ? { ...user, predictions: { ...user.predictions, [field]: value } }
          : user,
      );

      if (!editingSession) {
        setWeekendStateByMeetingKey((currentWeekendStateByMeetingKey) =>
          upsertWeekendPredictionState(
            currentWeekendStateByMeetingKey,
            selectedMeetingKey,
            updatedUsers,
            raceResults,
          ),
        );
      }

      return updatedUsers;
    });
  }

  function updateRaceResult(field: PredictionKey, value: string) {
    setRaceResults((currentResults) => {
      const updatedResults = {
        ...currentResults,
        [field]: value,
      };

      if (!editingSession) {
        setWeekendStateByMeetingKey((currentWeekendStateByMeetingKey) =>
          upsertWeekendPredictionState(
            currentWeekendStateByMeetingKey,
            selectedMeetingKey,
            users,
            updatedResults,
          ),
        );
      }

      return updatedResults;
    });
  }

  async function clearAllPredictions() {
    if (editingSession) {
      return;
    }

    if (!window.confirm(uiText.alerts.clearConfirm)) {
      return;
    }

    const clearedUsers = users.map((user) => ({
      ...user,
      predictions: createEmptyPrediction(),
    }));

    setUsers(clearedUsers);
    setRaceResults(createEmptyPrediction());
    const nextWeekendStateByMeetingKey = upsertWeekendPredictionState(
      weekendStateByMeetingKey,
      selectedMeetingKey,
      clearedUsers,
      createEmptyPrediction(),
    );
    setWeekendStateByMeetingKey(nextWeekendStateByMeetingKey);

    try {
      await persistAppData({
        users: clearedUsers,
        raceResults: createEmptyPrediction(),
        weekendStateByMeetingKey: nextWeekendStateByMeetingKey,
      });
      window.alert(appConfig.uiText.backend.messages.saveSuccess);
    } catch (error) {
      handleSaveFailure('Clear and save error:', error);
    }
  }

  async function handleDeleteHistoryRace(historyIndex: number) {
    if (editingSession) {
      return;
    }

    if (!window.confirm(uiText.alerts.deleteRaceConfirm)) {
      return;
    }

    const updatedHistory = history.filter((_, index) => index !== historyIndex);
    // Preserviamo i nomi correnti degli utenti
    const currentNames = users.map(u => u.name);
    const rebuiltUsers = rebuildUsersFromHistory(currentNames, updatedHistory);

    const nextUsers = mergePredictionsIntoUsers(rebuiltUsers, users);

    setHistory(updatedHistory);
    setUsers(nextUsers);
    
    try {
      await persistAppData({
        history: updatedHistory,
        users: nextUsers,
      });
    } catch (error) {
      handleSaveFailure('Delete error:', error);
    }
  }

  function handleEditHistoryRace(historyIndex: number) {
    if (editingSession) {
      return;
    }

    const record = history[historyIndex];
    if (!record) {
      return;
    }

    const updatedHistory = history.filter((_, index) => index !== historyIndex);
    // Preserviamo i nomi correnti degli utenti
    const currentNames = users.map(u => u.name);
    const rebuiltUsers = rebuildUsersFromHistory(currentNames, updatedHistory).map((user) => {
      const storedPrediction = record.userPredictions[user.name]?.prediction;

      return {
        ...user,
        predictions: storedPrediction ? { ...storedPrediction } : createEmptyPrediction(),
      };
    });
    const resolvedRace = resolveRaceFromRecord(record);

    setHistory(updatedHistory);
    setUsers(rebuiltUsers);
    setRaceResults({ ...record.results });
    setSelectedMeetingKey(resolvedRace?.meetingKey ?? '');
    setGpName(resolvedRace?.grandPrixTitle ?? resolvedRace?.meetingName ?? record.gpName);
    setEditingSession({
      record,
      historyIndex,
    });
    window.alert(
      formatText(uiText.alerts.editRaceLoaded, {
        gpName: record.gpName,
      }),
    );
  }

  function handleCancelEditRace() {
    if (!editingSession) {
      return;
    }

    if (!window.confirm(uiText.alerts.cancelEditConfirm)) {
      return;
    }

    const restoredHistory = [...history];
    restoredHistory.splice(editingSession.historyIndex, 0, editingSession.record);
    // Preserviamo i nomi correnti degli utenti
    const currentNames = users.map(u => u.name);
    const restoredUsers = rebuildUsersFromHistory(currentNames, restoredHistory);
    const restoredRace =
      resolveRaceFromRecord(editingSession.record) ?? getNextUpcomingRace(sortedCalendar);
    const restoredMeetingKey = restoredRace?.meetingKey ?? '';
    const restoredWeekendState = getWeekendPredictionState(
      weekendStateByMeetingKey,
      restoredMeetingKey,
    );
    const restoredHydratedUsers = hydrateUsersForWeekend(restoredUsers, restoredWeekendState);

    setHistory(restoredHistory);
    setUsers(restoredHydratedUsers);
    setRaceResults(restoredWeekendState.raceResults);
    setSelectedMeetingKey(restoredMeetingKey);
    setGpName(
      restoredRace?.grandPrixTitle ?? restoredRace?.meetingName ?? editingSession.record.gpName,
    );
    setEditingSession(null);
  }

  async function calculateAndApplyPoints() {
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
      selectedRace.meetingKey,
      raceResults,
      users,
      points,
      () => new Date().toLocaleDateString(),
      editingSession?.record.date,
    );

    const clearedUsers = updatedUsers.map((user) => ({
      ...user,
      predictions: createEmptyPrediction(),
    }));

    let nextHistory = history;
    let nextMeetingKey = selectedMeetingKey;
    let nextGpName = gpName;
    let nextUsers = clearedUsers;
    let nextRaceResults = createEmptyPrediction();
    let nextWeekendStateByMeetingKey = weekendStateByMeetingKey;

    if (editingSession) {
      const updatedHistory = [...history];
      updatedHistory.splice(editingSession.historyIndex, 0, record);
      const currentWeekendView = hydrateSelectedWeekendView(selectedRace.meetingKey, updatedUsers);
      nextHistory = updatedHistory;
      nextUsers = currentWeekendView.users;
      nextRaceResults = currentWeekendView.raceResults;
      setUsers(currentWeekendView.users);
      setHistory(updatedHistory);
      setSelectedMeetingKey(selectedRace.meetingKey);
      setGpName(selectedRace.grandPrixTitle ?? selectedRace.meetingName ?? '');
      setRaceResults(currentWeekendView.raceResults);
      setEditingSession(null);
    } else {
      const nextRace = getNextRaceAfter(sortedCalendar, selectedRace);
      nextWeekendStateByMeetingKey = upsertWeekendPredictionState(
        weekendStateByMeetingKey,
        selectedRace.meetingKey,
        clearedUsers,
        createEmptyPrediction(),
      );
      nextHistory = [record, ...history];
      nextMeetingKey = nextRace?.meetingKey ?? selectedRace.meetingKey;
      nextGpName = nextRace?.grandPrixTitle ?? nextRace?.meetingName ?? '';
      const nextWeekendView = {
        users: hydrateUsersForWeekend(
          updatedUsers,
          getWeekendPredictionState(nextWeekendStateByMeetingKey, nextMeetingKey),
        ),
        raceResults: getWeekendPredictionState(nextWeekendStateByMeetingKey, nextMeetingKey)
          .raceResults,
      };

      nextUsers = nextWeekendView.users;
      nextRaceResults = nextWeekendView.raceResults;

      setUsers(nextWeekendView.users);
      setHistory((currentHistory) => [record, ...currentHistory]);
      setSelectedMeetingKey(nextMeetingKey);
      setGpName(nextGpName);
      setRaceResults(nextWeekendView.raceResults);
      setWeekendStateByMeetingKey(nextWeekendStateByMeetingKey);
    }

    try {
      await persistAppData({
        users: nextUsers,
        history: nextHistory,
        selectedMeetingKey: nextMeetingKey,
        gpName: nextGpName,
        raceResults: nextRaceResults,
        weekendStateByMeetingKey: nextWeekendStateByMeetingKey,
      });

      window.alert(
        formatText(uiText.alerts.raceSaved, {
          gpName: record.gpName,
        }),
      );
    } catch (error) {
      handleSaveFailure('Save race error:', error);
    }
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
        <div className="pitstop-loader" data-testid="pitstop-loader">
          <div className="mechanic-container">
            <img src={pitstopIcon} alt="Pitstop mechanic" className="mechanic-icon" />
            <img src={tireIcon} alt="Spinning tire" className="tire-icon spin" />
          </div>
          <div className="speech-bubble">
            {loadingMessage}
          </div>
        </div>
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

  const raceLocked = isRaceStarted(selectedRace);
  const isFinished = isRaceFinished(selectedRace);
  const allResultsFilled = allLiveResultsFilled;
  const canAssignPoints = isFinished && allResultsFilled;

  let disabledReason = '';
  if (!canAssignPoints) {
    if (!raceLocked) {
      disabledReason = uiText.tooltips.raceNotStarted;
    } else if (!isFinished) {
      disabledReason = uiText.tooltips.raceInProgress;
    } else {
      disabledReason = uiText.tooltips.missingResults;
    }
  }

  /* v8 ignore next -- layout is exercised end-to-end via RTL and browser smoke tests */
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
          <h1 aria-label={visibleAppTitle}>
            <span className="hero-title-line">{heroTitle.primaryLine}</span>
            {heroTitle.secondaryLine ? (
              <span className="hero-title-line">{heroTitle.secondaryLine}</span>
            ) : null}
          </h1>
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
              <span>
                {selectedRace?.meetingKey === nextUpcomingRace?.meetingKey
                  ? uiText.headings.nextRace
                  : uiText.labels.selectedRace}
              </span>
            </div>
            {selectedRace ? (
              <div className="next-race-content">
                <div className="next-race-main">
                  <strong>{selectedRace.grandPrixTitle}</strong>
                  <span>{selectedRace.dateRangeLabel}</span>
                  <span className="round-label">
                    {uiText.labels.calendarRound} {selectedRace.roundNumber}
                  </span>
                  <span className={`race-badge ${selectedRace.isSprintWeekend ? 'sprint' : ''}`}>
                    {selectedRace.isSprintWeekend
                      ? uiText.calendar.sprintBadge
                      : uiText.calendar.raceBadge}
                  </span>
                </div>
                
                {selectedRace.sessions && selectedRace.sessions.length > 0 ? (
                  <div className="session-schedule">
                    {selectedRace.sessions.map((session, idx) => {
                      const sessionTime = formatSessionTimeParts(session.startTime);

                      return (
                        <div key={`${session.name}-${idx}`} className="session-row">
                          <div className="session-name-group">
                            <SessionIcon name={session.name} size={14} />
                            <span className="session-name">{translateSessionName(session.name)}</span>
                          </div>
                          <div
                            aria-label={sessionTime?.label}
                            className={`session-time ${sessionTime ? '' : 'session-time-empty'}`.trim()}
                          >
                            {sessionTime ? (
                              <>
                                <span className="session-date-line">
                                  <span className="session-day">{sessionTime.dayLabel}</span>
                                  <span className="session-calendar-date">
                                    {sessionTime.dateLabel}
                                  </span>
                                </span>
                                <span className="session-clock">{sessionTime.timeLabel}</span>
                              </>
                            ) : (
                              <span className="session-calendar-date">-</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="session-schedule">
                    <p className="sidebar-note">Orari in fase di sincronizzazione...</p>
                  </div>
                )}
              </div>
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
                  <strong className="live-score">
                    <span className="live-score-value">
                      {calculateLiveTotal(user, raceResults, points)}
                    </span>
                    <span className="live-score-suffix">{uiText.pointsSuffix}</span>
                  </strong>
                </div>
              ))}
            </div>
            <p className="sidebar-note">{uiText.history.liveHint}</p>
            {liveResultsStatusMessage ? (
              <p className="sidebar-note status-note">{liveResultsStatusMessage}</p>
            ) : null}
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
                    disabled={Boolean(editingSession)}
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
                      } ${weekend.isSprintWeekend ? 'sprint' : ''}`}
                      onClick={() => handleRaceSelection(weekend.meetingKey)}
                      disabled={Boolean(editingSession)}
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
                  {uiText.headings.predictionEntry}
                </h2>
              </div>
            </div>

            {raceLocked && <p className="locked-banner">{uiText.calendar.raceLocked}</p>}
            {predictionResultsStatusMessage ? (
              <p className="sidebar-note status-note">{predictionResultsStatusMessage}</p>
            ) : null}

            <div className="predictions-grid">
              {users.map((user) => (
                <article key={user.name} className="user-card">
                  <div className="user-card-head">
                    <h3>{user.name}</h3>
                    <span className="points-preview">
                      <span className="points-preview-label">{uiText.labels.potential}:</span>
                      <span className="points-preview-value">
                        {calculatePotentialPoints(user.predictions)}
                      </span>
                      <span className="points-preview-suffix">{uiText.pointsSuffix}</span>
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
                        disabled={raceLocked}
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

            <div className="stacked-actions">
              <button
                className="secondary-button"
                onClick={clearAllPredictions}
                type="button"
                disabled={raceLocked || Boolean(editingSession)}
              >
                <Trash2 size={16} />
                {uiText.buttons.clear}
              </button>
              <button
                className="primary-button"
                onClick={handleSavePredictions}
                type="button"
                disabled={raceLocked || Boolean(editingSession)}
              >
                <Save size={16} />
                {uiText.buttons.savePredictions}
              </button>
            </div>
          </section>

          <section className="panel accent-panel">
            <div className="section-title">
              <ListChecks size={20} />
              <h2>{uiText.headings.results}</h2>
            </div>

            {editingSession ? <p className="editing-banner">{uiText.history.editingLabel}</p> : null}

            {selectedRace ? (
              <div className="selected-race-banner">
                <div className="selected-race-info">
                  <span className="eyebrow">{uiText.labels.selectedRace}</span>
                  <strong>{selectedRace.grandPrixTitle}</strong>
                  <span>{selectedRace.dateRangeLabel}</span>
                </div>
                {selectedRace.trackOutlineUrl ? (
                  <div className="track-map-container">
                    <img
                      alt={selectedRace.meetingName}
                      className="track-map"
                      src={selectedRace.trackOutlineUrl}
                    />
                  </div>
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

            <div className="results-actions">
              {editingSession ? (
                <button className="secondary-button" onClick={handleCancelEditRace} type="button">
                  {uiText.buttons.cancelEdit}
                </button>
              ) : null}
              <div 
                className={`tooltip-wrapper ${!canAssignPoints ? 'disabled-wrapper' : ''} ${showTooltip && !canAssignPoints ? 'show-tooltip' : ''}`}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => {
                  if (!canAssignPoints) {
                    setShowTooltip(!showTooltip);
                    setTimeout(() => setShowTooltip(false), 3000);
                  }
                }}
              >
                {!canAssignPoints && (
                  <div className="tooltip-text">{disabledReason}</div>
                )}
                <button className="primary-button" onClick={calculateAndApplyPoints} type="button" disabled={!canAssignPoints}>
                  {editingSession ? uiText.buttons.saveEditedRace : uiText.buttons.confirmResults}
                </button>
              </div>
            </div>
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
                      <div className="history-top-row">
                        <div>
                          <strong>{record.gpName}</strong>
                          <span>{record.date}</span>
                        </div>
                        <div className="history-actions">
                          <button
                            className="secondary-button compact-button"
                            onClick={() => handleEditHistoryRace(index)}
                            type="button"
                            disabled={Boolean(editingSession)}
                          >
                            {uiText.buttons.editRace}
                          </button>
                          <button
                            className="secondary-button compact-button danger-button"
                            onClick={() => handleDeleteHistoryRace(index)}
                            type="button"
                            disabled={Boolean(editingSession)}
                          >
                            {uiText.buttons.deleteRace}
                          </button>
                        </div>
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
        <p className="app-version">v{appVersion}</p>
      </footer>
    </div>
  );
}

export default App;
/* v8 ignore stop */
