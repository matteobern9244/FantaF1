import { useCallback, useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Flag,
  ShieldCheck,
  Timer,
  Trophy,
  Zap,
  FastForward,
  Gauge,
  LockKeyhole,
  Download,
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
  standingsApiUrl,
  visibleAppTitle,
} from './constants';
import {
  buildEmptyAppData,
  fetchWithRetry,
  formatText,
  getNextRaceAfter,
  getOfficialResultsAvailability,
  getRaceStartTime,
  hasQualifyingOrSprintResult,
  hasPredictionValue,
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
  RacePhase,
  RaceWeekend,
  SessionState,
  StandingsPayload,
  UserData,
  ViewMode,
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
import { buildSeasonAnalytics, buildUserAnalytics, buildUserKpiSummaries } from './utils/analytics';
import { createSaveRequestError, getSaveErrorAlertMessage } from './utils/save';
import { fetchOfficialResults, normalizeOfficialResultsResponse } from './utils/resultsApi';
import { splitHeroTitle } from './utils/title';
import { WeekendStateAssembler } from './utils/weekendStateService';
import WeekendPulseHeroCard from './components/WeekendPulseHeroCard';
import AppLayout from './components/AppLayout';
import DashboardPage from './pages/DashboardPage';
import PredictionsPage from './pages/PredictionsPage';
import StandingsPage from './pages/StandingsPage';
import AnalysisPage from './pages/AnalysisPage';
import AdminPage from './pages/AdminPage';
import { appText } from './uiText';
import {
  getWeekendPredictionState,
  hydrateUsersForWeekend,
  upsertWeekendPredictionState,
  upsertWeekendRaceResults,
} from './utils/weekendState';
import { getSectionNavigationItems, getSectionNavigationLeafItems } from './utils/sectionNavigation';

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
const sessionApiUrl = '/api/session';
const adminSessionApiUrl = '/api/admin/session';
const weekendStateAssembler = new WeekendStateAssembler();

type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

type InstallCtaMode = 'native' | 'ios' | 'installed' | 'unavailable';

type ToastTone = 'info' | 'success';

interface ToastState {
  message: string;
  tone: ToastTone;
}

function buildLocationHash(hash: string) {
  const normalizedHash = hash.trim().replace(/^#/, '');
  return normalizedHash ? `#${normalizedHash}` : '';
}

function getNavigationAnchorOffset() {
  return window.matchMedia('(max-width: 900px)').matches ? 176 : 150;
}

function scrollSectionIntoView(targetElement: HTMLElement, behavior: ScrollBehavior = 'smooth') {
  const anchorOffset = getNavigationAnchorOffset();
  const targetTop = Math.max(0, window.scrollY + targetElement.getBoundingClientRect().top - anchorOffset);
  window.scrollTo({ top: targetTop, behavior });
}

function isStandaloneInstallContext() {
  const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');
  const navigatorWithStandalone = navigator as NavigatorWithStandalone;
  return standaloneMediaQuery.matches || navigatorWithStandalone.standalone === true;
}

function isIosSafariInstallableBrowser() {
  const userAgent = window.navigator.userAgent;
  const isAppleMobileDevice = /iPad|iPhone|iPod/.test(userAgent);
  const isSafariEngine = /Safari/.test(userAgent);
  const isUnsupportedBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isAppleMobileDevice && isSafariEngine && !isUnsupportedBrowser;
}

function resolveInstallCtaMode({
  isAppInstalled,
  hasInstallPrompt,
  isIosSafari,
}: {
  isAppInstalled: boolean;
  hasInstallPrompt: boolean;
  isIosSafari: boolean;
}): InstallCtaMode {
  if (isAppInstalled) {
    return 'installed';
  }

  if (hasInstallPrompt) {
    return 'native';
  }

  if (isIosSafari) {
    return 'ios';
  }

  return 'unavailable';
}

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
  const navigate = useNavigate();
  const location = useLocation();
  const manualNavigationLockDurationMs = 900;
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
  const [standings, setStandings] = useState<StandingsPayload>({
    driverStandings: [],
    constructorStandings: [],
    updatedAt: '',
  });
  const [editingSession, setEditingSession] = useState<{
    record: AppData['history'][number];
    historyIndex: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(appText.shell.loadingMessage);
  const [loadError, setLoadError] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('public');
  const [sessionState, setSessionState] = useState<SessionState>({
    isAdmin: false,
    defaultViewMode: 'public',
  });
  const [selectedInsightsUser, setSelectedInsightsUser] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<DeferredInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(() => isStandaloneInstallContext());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyUserFilter, setHistoryUserFilter] = useState('all');
  const [expandedHistoryKey, setExpandedHistoryKey] = useState('');
  const [selectedRacePhase, setSelectedRacePhase] = useState<RacePhase>('open');
  const [selectedRaceHighlightsVideoUrl, setSelectedRaceHighlightsVideoUrl] = useState('');
  const [activeSectionId, setActiveSectionId] = useState('');
  const selectedMeetingKeyRef = useRef(selectedMeetingKey);
  const toastTimeoutRef = useRef<number | null>(null);
  const handledHashLocationRef = useRef('');
  const navigationLockTimeoutRef = useRef<number | null>(null);
  const manualNavigationTargetRef = useRef<string | null>(null);
  const pendingPathnameRef = useRef<string | null>(null);

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
  const raceLocked = isRaceStarted(selectedRace);
  const predictionsLocked = selectedRacePhase !== 'open' || raceLocked;
  const isFinished = selectedRacePhase === 'finished';
  const allResultsFilled = allLiveResultsFilled;
  const canAssignPoints = isFinished && allResultsFilled;
  const isPublicView = viewMode === 'public';
  const sectionNavigationItems = getSectionNavigationItems(viewMode);
  const sectionNavigationLeafItems = getSectionNavigationLeafItems(viewMode);
  const firstSectionId = sectionNavigationLeafItems[0]?.id ?? '';
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
  const kpiSummaries = buildUserKpiSummaries(users, history);
  const selectedInsightsUserName = selectedInsightsUser || users[0]?.name || '';
  const selectedKpiSummary =
    kpiSummaries.find((summary) => summary.userName === selectedInsightsUserName) ?? null;
  const selectedAnalyticsSummary = selectedInsightsUserName
    ? buildUserAnalytics(history, selectedInsightsUserName)
    : null;
  const seasonAnalytics = buildSeasonAnalytics(users, history, sortedCalendar);
  const installCtaMode = resolveInstallCtaMode({
    isAppInstalled,
    hasInstallPrompt: Boolean(installPromptEvent),
    isIosSafari: isIosSafariInstallableBrowser(),
  });
  const weekendStartTime = getRaceStartTime(selectedRace);
  const shouldShowOpenPredictionsStrip =
    selectedRacePhase === 'open' && !hasQualifyingOrSprintResult(raceResults);
  const weekendStatusLabel = !selectedRace
    ? appText.shell.weekendStatus.unavailable
    : selectedRacePhase === 'finished'
      ? appText.shell.weekendStatus.completed
      : selectedRacePhase === 'live'
        ? appText.shell.weekendStatus.live
        : appText.shell.weekendStatus.open;
  const selectedRaceRecapTitle = !selectedRace
    ? uiText.labels.selectedRace
    : selectedRacePhase === 'finished'
      ? selectedRace.grandPrixTitle || selectedRace.meetingName
      : selectedRace.meetingName;
  const weekendCountdownLabel = weekendStartTime
    ? new Intl.RelativeTimeFormat('it', { numeric: 'auto' }).format(
        Math.round((weekendStartTime.getTime() - Date.now()) / (1000 * 60 * 60)),
        'hour',
      )
    : uiText.placeholders.emptyOption;
  const weekendComparison = users
    .map((user) => {
      const matchedFields = predictionFieldOrder.filter(
        (field) => hasPredictionValue(raceResults[field]) && user.predictions[field] === raceResults[field],
      );

      return {
        userName: user.name,
        projection: calculatePotentialPoints(user.predictions),
        liveTotal: calculateLiveTotal(user, raceResults, points),
        matchedFields,
      };
    })
    .sort((firstEntry, secondEntry) => secondEntry.liveTotal - firstEntry.liveTotal);
  const filteredHistoryEntries = history.map((record, index) => ({ record, index })).filter(({ record }) => {
    const matchesSearch = historySearch.trim().length === 0
      || record.gpName.toLowerCase().includes(historySearch.trim().toLowerCase());
    const matchesUser = historyUserFilter === 'all' || Boolean(record.userPredictions[historyUserFilter]);
    return matchesSearch && matchesUser;
  });

  useEffect(() => {
    selectedMeetingKeyRef.current = selectedMeetingKey;
  }, [selectedMeetingKey]);

  useEffect(() => {
    if (pendingPathnameRef.current && location.pathname === pendingPathnameRef.current) {
      pendingPathnameRef.current = null;
    }
  }, [location.pathname]);

  useEffect(() => {
    setSelectedRacePhase(raceLocked ? 'live' : 'open');
  }, [raceLocked, selectedRace?.meetingKey]);

  useEffect(() => {
    setSelectedRaceHighlightsVideoUrl(selectedRace?.highlightsVideoUrl ?? '');
  }, [selectedRace?.highlightsVideoUrl, selectedRace?.meetingKey]);

  function showToastMessage(message: string, tone: ToastTone = 'info') {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToast({ message, tone });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3200);
  }

  function scheduleManualNavigation(sectionId: string) {
    if (navigationLockTimeoutRef.current !== null) {
      window.clearTimeout(navigationLockTimeoutRef.current);
    }

    manualNavigationTargetRef.current = sectionId;
    navigationLockTimeoutRef.current = window.setTimeout(() => {
      manualNavigationTargetRef.current = null;
      navigationLockTimeoutRef.current = null;
    }, manualNavigationLockDurationMs);
  }

  function navigateToSection(sectionId: string) {
    if (sectionId === 'admin-section' && !sessionState.isAdmin) {
      handleOpenAdminLogin();
      return;
    }

    const leafItems = getSectionNavigationLeafItems(sessionState.isAdmin ? 'admin' : 'public');
    const item = leafItems.find(i => i.id === sectionId);

    if (item) {
      const [path] = item.route.split('#');
      const nextHash = buildLocationHash(sectionId);

      if (location.pathname !== path) {
        handledHashLocationRef.current = '';
        scheduleManualNavigation(sectionId);
        setActiveSectionId(sectionId);
        navigate(item.route);
      } else {
        const targetElement = document.getElementById(sectionId);

        scheduleManualNavigation(sectionId);
        setActiveSectionId(sectionId);
        navigate(
          { pathname: location.pathname, search: location.search, hash: nextHash },
          { replace: true },
        );

        if (targetElement) {
          handledHashLocationRef.current = `${location.pathname}${nextHash}`;
          scrollSectionIntoView(targetElement);
        }
      }
    }
  }

  function handleOpenMobileNav() {
    setIsMobileNavOpen(true);
  }

  function handleCloseMobileNav() {
    setIsMobileNavOpen(false);
  }

  function handleOpenAdminLogin() {
    setShowAdminLogin(true);
  }

  function handleToggleViewMode() {
    setViewMode((currentViewMode) => (currentViewMode === 'public' ? 'admin' : 'public'));
  }

  useEffect(() => {
    if (!selectedInsightsUser && users[0]?.name) {
      setSelectedInsightsUser(users[0].name);
    }
  }, [selectedInsightsUser, users]);

  useEffect(() => {
    const standaloneModeQuery = window.matchMedia('(display-mode: standalone)');

    function handleStandaloneChange(event: MediaQueryListEvent) {
      setIsAppInstalled(event.matches || (navigator as NavigatorWithStandalone).standalone === true);
    }

    setIsAppInstalled(standaloneModeQuery.matches || (navigator as NavigatorWithStandalone).standalone === true);

    standaloneModeQuery.addEventListener('change', handleStandaloneChange);

    return () => {
      standaloneModeQuery.removeEventListener('change', handleStandaloneChange);
    };
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPromptEvent(event as DeferredInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallPromptEvent(null);
      setIsAppInstalled(true);
      setShowInstallInstructions(false);
      showToastMessage(uiText.status.pwaInstalled, 'success');
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }

      if (navigationLockTimeoutRef.current !== null) {
        window.clearTimeout(navigationLockTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    if (isMobileNavOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAppState() {
      const initialUrlSearchParams = new URLSearchParams(window.location.search);
      const requestedMeetingKey = initialUrlSearchParams.get('meeting');
      const requestedView = initialUrlSearchParams.get('view');
      const requestedHistoryUser = initialUrlSearchParams.get('historyUser');
      const requestedHistorySearch = initialUrlSearchParams.get('historySearch')?.trim() ?? '';
      setLoadingMessage(appText.shell.loadingTelemetryMessage);
      const [sessionResult, dataResult, driversResult, calendarResult, standingsResult] = await Promise.allSettled([
        fetchWithRetry<SessionState>(sessionApiUrl),
        fetchWithRetry<AppData>(dataApiUrl),
        fetchWithRetry<Driver[]>(driversApiUrl),
        fetchWithRetry<RaceWeekend[]>(calendarApiUrl),
        fetchWithRetry<StandingsPayload>(standingsApiUrl),
      ]);

      if (isCancelled) {
        return;
      }

      setLoadingMessage(appText.shell.loadingWeekendSetupMessage);

      const loadedDrivers =
        driversResult.status === 'fulfilled' ? driversResult.value : [];
      const loadedCalendar =
        calendarResult.status === 'fulfilled'
          ? sortCalendarByRound(calendarResult.value)
          : [];
      const fallbackData = buildEmptyAppData(loadedCalendar);
      const incomingData = dataResult.status === 'fulfilled' ? dataResult.value : fallbackData;
      const resolvedSessionState: SessionState =
        sessionResult.status === 'fulfilled'
          ? sessionResult.value
          : {
              isAdmin: saveRuntimeEnvironment === 'development',
              defaultViewMode: saveRuntimeEnvironment === 'development' ? 'admin' : 'public',
            };
      const {
        hydratedIncomingData,
        initialWeekendStateByMeetingKey,
        resolvedMeetingKey,
        resolvedRace,
      } = weekendStateAssembler.initializeLoadedAppData({
        incomingData,
        calendar: loadedCalendar,
        requestedMeetingKey: requestedMeetingKey ?? '',
        fallbackSessionState: {
          isAdmin: saveRuntimeEnvironment === 'development',
          defaultViewMode: saveRuntimeEnvironment === 'development' ? 'admin' : 'public',
        },
        sessionState: sessionResult.status === 'fulfilled' ? sessionResult.value : undefined,
      });
      const resolvedHistoryUserFilter =
        requestedHistoryUser && hydratedIncomingData.users.some((user) => user.name === requestedHistoryUser)
          ? requestedHistoryUser
          : 'all';

      setDrivers(loadedDrivers);
      setCalendar(loadedCalendar);
      setStandings(
        standingsResult.status === 'fulfilled'
          ? standingsResult.value
          : {
              driverStandings: [],
              constructorStandings: [],
              updatedAt: '',
            },
      );
      setSessionState(resolvedSessionState);
      setUsers(hydratedIncomingData.users);
      setHistory(hydratedIncomingData.history);
      setRaceResults(hydratedIncomingData.raceResults);
      setWeekendStateByMeetingKey(initialWeekendStateByMeetingKey);
      setSelectedMeetingKey(resolvedMeetingKey);
      setGpName(resolvedRace?.grandPrixTitle ?? fallbackData.gpName);
      setHistoryUserFilter(resolvedHistoryUserFilter);
      setHistorySearch(requestedHistorySearch);
      setViewMode(
        requestedView === 'public'
          ? 'public'
          : resolvedSessionState.isAdmin
            ? 'admin'
            : resolvedSessionState.defaultViewMode,
      );

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
    if (loading) {
      return;
    }

    const targetId = location.hash.replace(/^#/, '');
    if (!targetId) {
      handledHashLocationRef.current = '';
      return;
    }

    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      return;
    }

    const currentHashLocation = `${location.pathname}${location.hash}`;
    if (handledHashLocationRef.current === currentHashLocation) {
      return;
    }

    const scrollBehavior = manualNavigationTargetRef.current === targetId ? 'smooth' : 'auto';
    scrollSectionIntoView(targetElement, scrollBehavior);
    setActiveSectionId(targetId);
    handledHashLocationRef.current = currentHashLocation;
  }, [loading, location.hash, location.pathname, viewMode]);

  useEffect(() => {
    const effectSectionNavigationLeafItems = getSectionNavigationLeafItems(viewMode);

    if (loading || effectSectionNavigationLeafItems.length === 0) {
      return;
    }

    const hashSectionId = location.hash.replace(/^#/, '');
    const fallbackSectionId = hashSectionId || firstSectionId;
    setActiveSectionId((currentActiveSectionId) => {
      const isCurrentSectionVisible = effectSectionNavigationLeafItems.some(
        (item) => item.id === currentActiveSectionId,
      );
      return isCurrentSectionVisible ? currentActiveSectionId : fallbackSectionId;
    });

    if (typeof window.IntersectionObserver !== 'function') {
      return;
    }

    const observedSections = effectSectionNavigationLeafItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (observedSections.length === 0) {
      return;
    }

    const sectionObserver = new window.IntersectionObserver(
      (entries) => {
        const manualNavigationTarget = manualNavigationTargetRef.current;
        if (manualNavigationTarget) {
          const targetEntry = entries.find(
            (entry) => entry.isIntersecting && entry.target.id === manualNavigationTarget,
          );

          if (targetEntry?.target?.id) {
            setActiveSectionId(targetEntry.target.id);
            manualNavigationTargetRef.current = null;
            if (navigationLockTimeoutRef.current !== null) {
              window.clearTimeout(navigationLockTimeoutRef.current);
              navigationLockTimeoutRef.current = null;
            }
          }

          return;
        }

        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => {
            const navigationAnchorOffset = getNavigationAnchorOffset();
            const leftDistance = Math.abs(left.boundingClientRect.top - navigationAnchorOffset);
            const rightDistance = Math.abs(right.boundingClientRect.top - navigationAnchorOffset);

            if (leftDistance !== rightDistance) {
              return leftDistance - rightDistance;
            }

            if (left.intersectionRatio !== right.intersectionRatio) {
              return right.intersectionRatio - left.intersectionRatio;
            }

            return left.boundingClientRect.top - right.boundingClientRect.top;
          })[0];

        if (visibleEntry?.target?.id) {
          setActiveSectionId(visibleEntry.target.id);
        }
      },
      {
        rootMargin: '-18% 0px -62% 0px',
        threshold: [0.2, 0.4, 0.65],
      },
    );

    observedSections.forEach((section) => {
      sectionObserver.observe(section);
    });

    return () => {
      sectionObserver.disconnect();
    };
  }, [firstSectionId, loading, location.hash, viewMode]);

  const hydrateSelectedWeekendView = useCallback(
    (nextMeetingKey: string, baseUsers: UserData[]) =>
      weekendStateAssembler.hydrateSelectedWeekendView(
        weekendStateByMeetingKey,
        nextMeetingKey,
        baseUsers,
      ),
    [weekendStateByMeetingKey],
  );

  // Unified URL and State synchronization
  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams(location.search);
    const urlMeetingKey = params.get('meeting');
    const urlViewMode = params.get('view') as ViewMode | null;
    const normalizedPathname = location.pathname === '/' ? '/dashboard' : location.pathname;
    const targetPathname = pendingPathnameRef.current ?? normalizedPathname;

    // Sync URL -> State (e.g. on back/forward or manual URL edit)
    if (urlMeetingKey && urlMeetingKey !== selectedMeetingKey) {
      const race = getRaceByMeetingKey(sortedCalendar, urlMeetingKey);
      if (race) {
        const nextMeeting = race.meetingKey;
        const view = hydrateSelectedWeekendView(nextMeeting, users);
        setSelectedMeetingKey(nextMeeting);
        setGpName(race.grandPrixTitle || race.meetingName);
        setUsers(view.users);
        setRaceResults(view.raceResults);
      }
    }

    if (urlViewMode && urlViewMode !== viewMode) {
      setViewMode(urlViewMode);
    }

    // Sync State -> URL
    let changed = false;
    if (params.get('meeting') !== selectedMeetingKey) { params.set('meeting', selectedMeetingKey); changed = true; }
    if (params.get('view') !== viewMode) { params.set('view', viewMode); changed = true; }
    const currentHistoryUser = params.get('historyUser') ?? 'all';
    if (currentHistoryUser !== historyUserFilter) {
      if (historyUserFilter !== 'all') {
        params.set('historyUser', historyUserFilter);
      } else {
        params.delete('historyUser');
      }
      changed = true;
    }
    const currentHistorySearch = params.get('historySearch') ?? '';
    if (currentHistorySearch !== historySearch.trim()) {
      if (historySearch.trim()) {
        params.set('historySearch', historySearch.trim());
      } else {
        params.delete('historySearch');
      }
      changed = true;
    }

    if (changed) {
      const nextSearch = `?${params.toString()}`;
      if (location.pathname !== targetPathname || location.search !== nextSearch) {
        navigate({ pathname: targetPathname, search: nextSearch, hash: location.hash }, { replace: true });
      }
    } else if (location.pathname !== targetPathname) {
      navigate({ pathname: targetPathname, search: location.search, hash: location.hash }, { replace: true });
    }
  }, [
    historySearch,
    historyUserFilter,
    hydrateSelectedWeekendView,
    loading,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    selectedMeetingKey,
    sortedCalendar,
    users,
    viewMode,
  ]);

  // Sync Active Section ID to Route
  useEffect(() => {
    if (loading) return;
    const leafItems = getSectionNavigationLeafItems(viewMode);
    const currentPath = location.pathname;
    const currentHash = location.hash.replace('#', '');
    
    const matchingItem = leafItems.find(item => {
      const [itemPath, itemHash] = item.route.split('#');
      if (currentHash) return itemPath === currentPath && itemHash === currentHash;
      return itemPath === currentPath;
    });

    if (matchingItem && matchingItem.id !== activeSectionId) {
      setActiveSectionId(matchingItem.id);
    }
  }, [location.pathname, location.hash, loading, viewMode, activeSectionId]);

  useEffect(() => {
    if (!selectedRace || editingSession) {
      return;
    }

    const activeRace = selectedRace;
    let isCancelled = false;
    let pollingId: number | null = null;

    async function syncSelectedWeekendResults() {
      try {
        const payload = await fetchOfficialResults(activeRace.meetingKey);
        if (isCancelled) {
          return;
        }

        if (selectedMeetingKeyRef.current !== activeRace.meetingKey) {
          return;
        }

        const { results, racePhase, highlightsVideoUrl } = normalizeOfficialResultsResponse(payload);

        setSelectedRacePhase(racePhase ?? (raceLocked ? 'live' : 'open'));
        setSelectedRaceHighlightsVideoUrl(highlightsVideoUrl);

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

    if (!allLiveResultsFilled && isWeekendActive(activeRace)) {
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
    raceLocked,
    selectedRace,
  ]);

  const liveLeaderboardUsers = sortUsersByLiveTotal(users, raceResults, points);

  function calculatePotentialPoints(userPrediction: Prediction) {
    return calculateProjectedPoints(userPrediction, raceResults, points);
  }

  function handleWatchHighlights() {
    if (!selectedRaceHighlightsVideoUrl) {
      return;
    }

    window.open(selectedRaceHighlightsVideoUrl, '_blank', 'noopener,noreferrer');
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
    const payload = weekendStateAssembler.buildPersistedPayload(payloadBase, {
      editingSession: Boolean(editingSession),
    });

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
      showToastMessage(uiText.status.predictionsSaved, 'success');
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

    const params = new URLSearchParams(location.search);
    params.set('meeting', nextMeeting);
    pendingPathnameRef.current = '/pronostici';
    navigate(`/pronostici?${params.toString()}`);
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

  async function handleAdminLogin() {
    if (!adminPassword.trim()) {
      setAdminLoginError(uiText.alerts.adminPasswordRequired);
      return;
    }

    try {
      const response = await fetch(adminSessionApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (!response.ok) {
        let loginErrorMessage = uiText.backend.errors.saveFailed;

        try {
          const payload = await response.json() as { code?: string; error?: string };

          if (payload.code === 'admin_auth_invalid') {
            loginErrorMessage = uiText.backend.auth.invalidPassword;
          } else if (typeof payload.error === 'string' && payload.error.trim()) {
            loginErrorMessage = payload.error.trim();
          }
        } catch {
          loginErrorMessage = uiText.backend.errors.saveFailed;
        }

        setAdminLoginError(loginErrorMessage);
        return;
      }

      const session = await response.json() as SessionState;
      setSessionState(session);
      setViewMode('admin');
      setShowAdminLogin(false);
      setAdminPassword('');
      setAdminLoginError('');
      showToastMessage(uiText.status.adminLoginSuccess, 'success');
    } catch (error) {
      console.error(error);
      setAdminLoginError(uiText.backend.errors.saveFailed);
    }
  }

  async function handleAdminLogout() {
    await fetch(adminSessionApiUrl, {
      method: 'DELETE',
    });
    setSessionState({
      isAdmin: false,
      defaultViewMode: 'public',
    });
    setViewMode('public');
    showToastMessage(uiText.status.adminLogoutSuccess, 'success');
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
      showToastMessage(appConfig.uiText.backend.messages.saveSuccess, 'success');
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
    let nextUsers: UserData[] = clearedUsers;
    let nextRaceResults = createEmptyPrediction();
    let nextWeekendStateByMeetingKey = weekendStateByMeetingKey;

    if (editingSession) {
      const updatedHistory = [...history];
      updatedHistory.splice(editingSession.historyIndex, 0, record);
      const currentWeekendView: {
        users: UserData[];
        raceResults: Prediction;
      } = hydrateSelectedWeekendView(selectedRace.meetingKey, updatedUsers);
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
      const nextWeekendView: {
        users: UserData[];
        raceResults: Prediction;
      } = {
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
      showToastMessage(
        formatText(uiText.alerts.raceSaved, {
          gpName: record.gpName,
        }),
        'success',
      );
    } catch (error) {
      handleSaveFailure('Save race error:', error);
    }
  }

  function formatAverageValue(value: number | null, digits = 1) {
    if (value === null) {
      return uiText.placeholders.emptyOption;
    }

    return value.toFixed(digits).replace(/\.?0+$/, '');
  }

  function formatTrendDriver(driverId: string) {
    return getDriverDisplayNameById(drivers, driverId, uiText.history.unknownDriver);
  }

  async function handleInstallApp() {
    if (installCtaMode === 'ios') {
      setShowInstallInstructions(true);
      showToastMessage(uiText.status.pwaInstallInstructionsOpened, 'info');
      return;
    }

    if (installCtaMode === 'installed') {
      showToastMessage(uiText.status.pwaAlreadyInstalled, 'info');
      return;
    }

    if (!installPromptEvent) {
      showToastMessage(uiText.status.pwaInstallUnavailable, 'info');
      return;
    }

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;

    if (choice.outcome === 'accepted') {
      showToastMessage(uiText.status.pwaInstalled, 'success');
      setInstallPromptEvent(null);
    }
  }

  function getExpandedHistoryKey(record: AppData['history'][number], index: number) {
    return `${record.gpName}-${record.date}-${index}`;
  }

  function getHistoryFieldHitLabel(record: AppData['history'][number], userName: string, field: PredictionKey) {
    const entry = record.userPredictions[userName];
    if (!entry) {
      return uiText.placeholders.emptyOption;
    }

    const driverName = getDriverDisplayNameById(drivers, entry.prediction[field], uiText.history.unknownDriver);
    const isHit = entry.prediction[field] && entry.prediction[field] === record.results[field];
    return `${driverName} ${isHit ? '✓' : '•'}`;
  }

  function getWeekendLiveDriverName(field: PredictionKey) {
    return getDriverDisplayNameById(drivers, raceResults[field], uiText.placeholders.emptyOption);
  }

  function getHistoryWinnerDriverName(record: AppData['history'][number], userName: string) {
    const winnerDriverId = record.userPredictions[userName]?.prediction.first ?? '';
    const winnerDriver = getDriverById(drivers, winnerDriverId);
    return winnerDriver ? formatDriverDisplayName(winnerDriver.name) : uiText.history.unknownDriver;
  }

  function getHistoryResultsPodium(record: AppData['history'][number]) {
    return ([
      { position: 1 as const, field: 'first' as const },
      { position: 2 as const, field: 'second' as const },
      { position: 3 as const, field: 'third' as const },
    ]).map(({ position, field }) => {
      const driver = getDriverById(drivers, record.results[field]);

      return {
        position,
        driverName: driver ? driver.name : uiText.history.unknownDriver,
        avatarUrl: driver?.avatarUrl ?? '',
        color: driver?.color ?? '',
      };
    });
  }

  function renderSelectedRaceTrackMap({ compact = false } = {}) {
    if (!selectedRace?.trackOutlineUrl) {
      return null;
    }

    return (
      <div className={`track-map-container ${compact ? 'track-map-container-compact' : ''}`.trim()}>
        <img
          alt={selectedRace.meetingName}
          className={`track-map ${compact ? 'track-map-compact' : ''}`.trim()}
          src={selectedRace.trackOutlineUrl}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="pitstop-loader" data-testid="pitstop-loader">
          <img src="/splash-logo-only.png" alt="FantaF1 splash logo" className="splash-logo" />
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

  const todayLabel = new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
  const statusChips = [
    {
      key: 'date',
      label: `${uiText.labels.todayStatus}: ${todayLabel}`,
    },
    {
      key: 'season',
      label: `${uiText.labels.seasonStatus} ${currentYear}`,
    },
    ...(
      selectedRacePhase === 'open' && !shouldShowOpenPredictionsStrip
        ? []
        : [{
            key: 'lock',
            label:
              selectedRacePhase === 'finished'
                ? uiText.status.raceFinishedStrip
                : selectedRacePhase === 'live'
                  ? uiText.status.raceLiveStrip
                  : uiText.status.raceOpenStrip,
            tone: selectedRacePhase === 'open' ? 'default' as const : 'alert' as const,
          }]
    ),
    ...(officialResultsAvailability === 'complete'
      ? [{ key: 'results', label: uiText.status.resultsReadyStrip, tone: 'success' as const }]
      : []),
  ];

  let disabledReason = '';
  if (!canAssignPoints) {
    if (selectedRacePhase === 'open') {
      disabledReason = uiText.tooltips.raceNotStarted;
    } else if (selectedRacePhase === 'live') {
      disabledReason = uiText.tooltips.raceInProgress;
    } else {
      disabledReason = uiText.tooltips.missingResults;
    }
  }

  /* v8 ignore next -- layout is exercised end-to-end via RTL and browser smoke tests */
  return (
    <AppLayout
      items={sectionNavigationItems}
      activeId={activeSectionId}
      onItemClick={navigateToSection}
      isAdmin={sessionState.isAdmin}
      viewMode={viewMode}
      onViewModeToggle={handleToggleViewMode}
      onLogout={handleAdminLogout}
      onLogin={handleOpenAdminLogin}
      isSidebarCollapsed={isSidebarCollapsed}
      onCollapseChange={setIsSidebarCollapsed}
      isMobileNavOpen={isMobileNavOpen}
      onOpenMobileNav={handleOpenMobileNav}
      onCloseMobileNav={handleCloseMobileNav}
      onInstall={handleInstallApp}
    >
      <header
        className="hero-panel"
      >
        {selectedRace?.heroImageUrl ? (
          <div
            aria-hidden="true"
            className="hero-race-background"
            data-testid="hero-race-background"
            style={{
              backgroundImage: `linear-gradient(145deg, rgba(10, 11, 19, 0.95), rgba(10, 11, 19, 0.55)), url(${selectedRace.heroImageUrl})`,
            }}
          />
        ) : null}
        <div className="status-strip">
          <div className="status-chip-row">
            {statusChips.map((chip) => (
              <span
                key={chip.key}
                className={`status-chip ${chip.tone ? `status-chip-${chip.tone}` : ''}`.trim()}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>
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
          <section className="hero-card next-race-card interactive-surface">
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
                    <p className="sidebar-note">{uiText.calendar.sessionsSyncing}</p>
                  </div>
                )}
              </div>
            ) : (
              <span>{uiText.calendar.empty}</span>
            )}
          </section>

          <WeekendPulseHeroCard
            officialResultsAvailability={officialResultsAvailability}
            weekendCountdownLabel={weekendCountdownLabel}
            weekendStatusLabel={weekendStatusLabel}
          />

          <section className="hero-card interactive-surface">
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

          <section className="hero-card hero-selected-race-card interactive-surface">
            <div className="card-heading">
              <Flag size={18} />
              <span>{selectedRaceRecapTitle}</span>
            </div>
            {selectedRace ? (
              <div className="driver-spotlight">
                {isPublicView ? renderSelectedRaceTrackMap({ compact: true }) : null}
                {predictionFieldOrder.map((field) => {
                  const driver = getDriverById(drivers, raceResults[field]);

                  return (
                    <div key={`hero-spotlight-${field}`} className="spotlight-row">
                      <span>{resultLabels[field]}</span>
                      <strong>
                        {driver ? driver.name : uiText.placeholders.emptyOption}
                      </strong>
                    </div>
                  );
                })}
                {selectedRacePhase === 'finished' ? (
                  <button
                    className="secondary-button highlights-button"
                    disabled={!selectedRaceHighlightsVideoUrl}
                    onClick={handleWatchHighlights}
                    type="button"
                  >
                    {selectedRaceHighlightsVideoUrl
                      ? uiText.buttons.watchHighlights
                      : uiText.buttons.highlightsUnavailable}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="empty-copy">{uiText.calendar.empty}</p>
            )}
          </section>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="content-column">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <DashboardPage
                sortedCalendar={sortedCalendar}
                selectedRace={selectedRace}
                handleRaceSelection={handleRaceSelection}
                editingSession={editingSession}
                getWeekendLiveDriverName={getWeekendLiveDriverName}
                predictionFieldOrder={predictionFieldOrder}
                predictionLabels={predictionLabels}
                weekendComparison={weekendComparison}
                isPublicView={isPublicView}
              />
            } />
            <Route path="/pronostici" element={
              <PredictionsPage
                isPublicView={isPublicView}
                selectedRacePhase={selectedRacePhase}
                predictionResultsStatusMessage={predictionResultsStatusMessage}
                users={users}
                calculatePotentialPoints={calculatePotentialPoints}
                predictionFieldOrder={predictionFieldOrder}
                predictionLabels={predictionLabels}
                updatePrediction={updatePrediction}
                predictionsLocked={predictionsLocked}
                sortedDrivers={sortedDrivers}
                drivers={drivers}
                clearAllPredictions={clearAllPredictions}
                handleSavePredictions={handleSavePredictions}
                editingSession={editingSession}
                resultLabels={resultLabels}
                raceResults={raceResults}
                updateRaceResult={updateRaceResult}
              />
            } />
            <Route path="/classifiche" element={
              <StandingsPage
                isPublicView={isPublicView}
                standings={standings}
                editingSession={editingSession}
                expandedHistoryKey={expandedHistoryKey}
                filteredHistoryEntries={filteredHistoryEntries}
                getHistoryFieldHitLabel={getHistoryFieldHitLabel}
                getHistoryKey={getExpandedHistoryKey}
                historySearch={historySearch}
                historyUserFilter={historyUserFilter}
                onDeleteHistoryRace={handleDeleteHistoryRace}
                onEditHistoryRace={handleEditHistoryRace}
                onHistorySearchChange={setHistorySearch}
                onHistoryUserFilterChange={setHistoryUserFilter}
                onToggleExpanded={setExpandedHistoryKey}
                predictionFieldOrder={predictionFieldOrder}
                predictionLabels={predictionLabels}
                resolveHistoryPodium={getHistoryResultsPodium}
                userDisplayNameForWinner={getHistoryWinnerDriverName}
                users={users}
              />
            } />
            <Route path="/analisi" element={
              <AnalysisPage
                seasonAnalytics={seasonAnalytics}
                predictionLabels={predictionLabels}
                selectedAnalyticsSummary={selectedAnalyticsSummary}
                formatTrendDriver={formatTrendDriver}
                selectedInsightsUserName={selectedInsightsUserName}
                formatAverageValue={formatAverageValue}
                selectedKpiSummary={selectedKpiSummary}
                users={users}
                onSelectedInsightsUserChange={setSelectedInsightsUser}
              />
            } />
            <Route path="/admin" element={
              <AdminPage
                sessionState={sessionState}
                adminPassword={adminPassword}
                onAdminPasswordChange={setAdminPassword}
                onAdminLogin={handleAdminLogin}
                adminLoginError={adminLoginError}
                editingSession={editingSession}
                selectedRace={selectedRace}
                renderSelectedRaceTrackMap={renderSelectedRaceTrackMap}
                predictionFieldOrder={predictionFieldOrder}
                resultLabels={resultLabels}
                raceResults={raceResults}
                onUpdateRaceResult={updateRaceResult}
                sortedDrivers={sortedDrivers}
                onCancelEditRace={handleCancelEditRace}
                canAssignPoints={canAssignPoints}
                showTooltip={showTooltip}
                onShowTooltipChange={setShowTooltip}
                disabledReason={disabledReason}
                onCalculateAndApplyPoints={calculateAndApplyPoints}
              />
            } />
          </Routes>
        </section>
      </main>

      {showAdminLogin ? (
        <div className="auth-modal-backdrop" role="presentation" onClick={() => setShowAdminLogin(false)}>
          <div
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-login-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title">
              <LockKeyhole size={20} />
              <h2 id="admin-login-title">{uiText.headings.adminAccess}</h2>
            </div>
            <div className="field-row">
              <label htmlFor="admin-password">{uiText.buttons.adminView}</label>
              <input
                id="admin-password"
                className="auth-input"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleAdminLogin()}
                autoFocus
              />
            </div>
            {adminLoginError ? <p className="locked-banner">{adminLoginError}</p> : null}
            <div className="results-actions">
              <button className="secondary-button" onClick={() => setShowAdminLogin(false)} type="button">
                {uiText.buttons.publicView}
              </button>
              <button className="primary-button" onClick={handleAdminLogin} type="button">
                <LockKeyhole size={16} />
                {uiText.buttons.adminView}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showInstallInstructions ? (
        <div className="auth-modal-backdrop" role="presentation" onClick={() => setShowInstallInstructions(false)}>
          <div
            className="auth-modal install-instructions-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-instructions-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title">
              <Download size={20} />
              <h2 id="install-instructions-title">{uiText.installDialog.title}</h2>
            </div>
            <p>{uiText.installDialog.description}</p>
            <ol className="install-instructions-list">
              {uiText.installDialog.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button className="secondary-button" onClick={() => setShowInstallInstructions(false)} type="button">
              {uiText.buttons.closeDialog}
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`toast-shell toast-${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}

      <footer className="app-footer">
        <p>{uiText.footer}</p>
        <p className="app-version">v{appVersion}</p>
      </footer>
    </AppLayout>
  );
}

export default App;
/* v8 ignore stop */
