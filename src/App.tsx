import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Flag,
  ListChecks,
  Menu,
  ShieldCheck,
  Save,
  Trash2,
  Trophy,
  User,
  Timer,
  Zap,
  FastForward,
  Gauge,
  Smartphone,
  BarChart3,
  LockKeyhole,
  Download,
  LogOut,
  ArrowUp,
  X,
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
import { buildSeasonAnalytics, buildUserAnalytics, buildUserKpiSummaries, trackedFields } from './utils/analytics';
import { createSaveRequestError, getSaveErrorAlertMessage } from './utils/save';
import { fetchOfficialResults, normalizeOfficialResultsResponse } from './utils/resultsApi';
import { splitHeroTitle } from './utils/title';
import { WeekendStateAssembler } from './utils/weekendStateService';
import HistoryArchivePanel from './components/HistoryArchivePanel';
import PublicGuidePanel from './components/PublicGuidePanel';
import SeasonAnalysisPanel from './components/SeasonAnalysisPanel';
import WeekendLivePanel from './components/WeekendLivePanel';
import WeekendPulseHeroCard from './components/WeekendPulseHeroCard';
import { appText } from './uiText';
import {
  getWeekendPredictionState,
  hydrateUsersForWeekend,
  upsertWeekendPredictionState,
  upsertWeekendRaceResults,
} from './utils/weekendState';
import { getSectionNavigationItems } from './utils/sectionNavigation';

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

type InstallCtaMode = 'hidden' | 'native' | 'ios';

type ToastTone = 'info' | 'success';

interface ToastState {
  message: string;
  tone: ToastTone;
}

function buildHashUrl(hash: string) {
  const normalizedHash = hash.trim().replace(/^#/, '');
  return `${window.location.pathname}${window.location.search}#${normalizedHash}`;
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
  isMobileViewport,
  isIosSafari,
}: {
  isAppInstalled: boolean;
  hasInstallPrompt: boolean;
  isMobileViewport: boolean;
  isIosSafari: boolean;
}): InstallCtaMode {
  if (isAppInstalled) {
    return 'hidden';
  }

  if (hasInstallPrompt) {
    return 'native';
  }

  if (isMobileViewport && isIosSafari) {
    return 'ios';
  }

  return 'hidden';
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
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isSectionDrawerOpen, setIsSectionDrawerOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyUserFilter, setHistoryUserFilter] = useState('all');
  const [expandedHistoryKey, setExpandedHistoryKey] = useState('');
  const [selectedRacePhase, setSelectedRacePhase] = useState<RacePhase>('open');
  const [selectedRaceHighlightsVideoUrl, setSelectedRaceHighlightsVideoUrl] = useState('');
  const [activeSectionId, setActiveSectionId] = useState('');
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);
  const [isBackToTopTooltipVisible, setIsBackToTopTooltipVisible] = useState(false);
  const selectedMeetingKeyRef = useRef(selectedMeetingKey);
  const toastTimeoutRef = useRef<number | null>(null);
  const initialHashHandledRef = useRef(false);
  const sectionDrawerRef = useRef<HTMLDivElement | null>(null);
  const sectionDrawerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sectionNavigationBoundaryRef = useRef<HTMLDivElement | null>(null);

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
  const firstSectionId = sectionNavigationItems[0]?.id ?? '';
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
    isMobileViewport,
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

  function closeSectionDrawer({ restoreFocus = false } = {}) {
    setIsSectionDrawerOpen(false);

    if (restoreFocus) {
      sectionDrawerTriggerRef.current?.focus();
    }
  }

  function navigateToSection(sectionId: string) {
    const targetElement = document.getElementById(sectionId);
    if (!targetElement) {
      return;
    }

    window.history.replaceState({}, '', buildHashUrl(sectionId));
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSectionId(sectionId);
    closeSectionDrawer();
  }

  function scrollBackToTop() {
    closeSectionDrawer();
    if (firstSectionId) {
      window.history.replaceState({}, '', buildHashUrl(firstSectionId));
      setActiveSectionId(firstSectionId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    if (!selectedInsightsUser && users[0]?.name) {
      setSelectedInsightsUser(users[0].name);
    }
  }, [selectedInsightsUser, users]);

  useEffect(() => {
    const mobileViewportQuery = window.matchMedia('(max-width: 767px)');
    const standaloneModeQuery = window.matchMedia('(display-mode: standalone)');

    function handleMobileViewportChange(event: MediaQueryListEvent) {
      setIsMobileViewport(event.matches);
    }

    function handleStandaloneChange(event: MediaQueryListEvent) {
      setIsAppInstalled(event.matches || (navigator as NavigatorWithStandalone).standalone === true);
    }

    setIsMobileViewport(mobileViewportQuery.matches);
    setIsAppInstalled(standaloneModeQuery.matches || (navigator as NavigatorWithStandalone).standalone === true);

    mobileViewportQuery.addEventListener('change', handleMobileViewportChange);
    standaloneModeQuery.addEventListener('change', handleStandaloneChange);

    return () => {
      mobileViewportQuery.removeEventListener('change', handleMobileViewportChange);
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
    };
  }, []);

  useEffect(() => {
    setIsSectionDrawerOpen(false);
  }, [viewMode]);

  useEffect(() => {
    if (!isMobileViewport) {
      setIsSectionDrawerOpen(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAppState() {
      const initialUrlSearchParams = new URLSearchParams(window.location.search);
      const requestedMeetingKey = initialUrlSearchParams.get('meeting');
      const requestedView = initialUrlSearchParams.get('view');
      const requestedHistoryUser = initialUrlSearchParams.get('historyUser');
      const requestedHistorySearch = initialUrlSearchParams.get('historySearch')?.trim() ?? '';
      setLoadingMessage(appText.shell.loadingTelemetryMessage);
      const [sessionResult, dataResult, driversResult, calendarResult] = await Promise.allSettled([
        fetchWithRetry<SessionState>(sessionApiUrl),
        fetchWithRetry<AppData>(dataApiUrl),
        fetchWithRetry<Driver[]>(driversApiUrl),
        fetchWithRetry<RaceWeekend[]>(calendarApiUrl),
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
    if (loading || initialHashHandledRef.current) {
      return;
    }

    const targetId = window.location.hash.replace(/^#/, '');
    if (!targetId) {
      initialHashHandledRef.current = true;
      return;
    }

    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      initialHashHandledRef.current = true;
      return;
    }

    targetElement.scrollIntoView();
    setActiveSectionId(targetId);
    initialHashHandledRef.current = true;
  }, [loading, viewMode]);

  useEffect(() => {
    if (loading || sectionNavigationItems.length === 0) {
      return;
    }

    const hashSectionId = window.location.hash.replace(/^#/, '');
    const fallbackSectionId = hashSectionId || firstSectionId;
    setActiveSectionId((currentActiveSectionId) => {
      const isCurrentSectionVisible = sectionNavigationItems.some((item) => item.id === currentActiveSectionId);
      return isCurrentSectionVisible ? currentActiveSectionId : fallbackSectionId;
    });

    if (typeof window.IntersectionObserver !== 'function') {
      return;
    }

    const observedSections = sectionNavigationItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (observedSections.length === 0) {
      return;
    }

    const sectionObserver = new window.IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

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
  }, [firstSectionId, loading, sectionNavigationItems]);

  useEffect(() => {
    if (!isSectionDrawerOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const drawerElement = sectionDrawerRef.current;
    const focusableElements = drawerElement
      ? Array.from(drawerElement.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      : [];
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];
    firstFocusableElement?.focus();

    function handleDrawerKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSectionDrawer({ restoreFocus: true });
        return;
      }

      if (event.key !== 'Tab' || focusableElements.length === 0) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement?.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement?.focus();
      }
    }

    document.addEventListener('keydown', handleDrawerKeydown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener('keydown', handleDrawerKeydown);
    };
  }, [isSectionDrawerOpen]);

  useEffect(() => {
    if (loading) {
      return;
    }

    function updateBackToTopVisibility() {
      const boundaryTop = sectionNavigationBoundaryRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const shouldShowBackToTop = boundaryTop < 0 || window.scrollY > 280;
      setIsBackToTopVisible(shouldShowBackToTop);
      if (!shouldShowBackToTop) {
        setIsBackToTopTooltipVisible(false);
      }
    }

    updateBackToTopVisibility();
    window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
    window.addEventListener('resize', updateBackToTopVisibility);

    return () => {
      window.removeEventListener('scroll', updateBackToTopVisibility);
      window.removeEventListener('resize', updateBackToTopVisibility);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set('meeting', selectedMeetingKey);
    params.set('view', viewMode);
    if (historyUserFilter !== 'all') {
      params.set('historyUser', historyUserFilter);
    } else {
      params.delete('historyUser');
    }
    if (historySearch.trim()) {
      params.set('historySearch', historySearch.trim());
    } else {
      params.delete('historySearch');
    }

    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, [historySearch, historyUserFilter, loading, selectedMeetingKey, viewMode]);

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

  function hydrateSelectedWeekendView(nextMeetingKey: string, baseUsers: UserData[]) {
    return weekendStateAssembler.hydrateSelectedWeekendView(
      weekendStateByMeetingKey,
      nextMeetingKey,
      baseUsers,
    );
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
        setAdminLoginError(uiText.backend.errors.saveFailed);
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

  function renderHistoryResults(record: AppData['history'][number]) {
    return formatText(uiText.history.resultSummaryTemplate, {
      actualLabel: uiText.history.actualLabel,
      first: getDriverDisplayNameById(drivers, record.results.first, uiText.history.unknownDriver),
      second: getDriverDisplayNameById(drivers, record.results.second, uiText.history.unknownDriver),
      third: getDriverDisplayNameById(drivers, record.results.third, uiText.history.unknownDriver),
      pole: getDriverDisplayNameById(drivers, record.results.pole, uiText.history.unknownDriver),
    });
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

    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;

    if (choice.outcome === 'accepted') {
      showToastMessage(uiText.status.pwaInstalled, 'success');
      setInstallPromptEvent(null);
    }
  }

  async function handleShareCurrentView() {
    const shareUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToastMessage(uiText.status.shareLinkCopied, 'success');
    } catch (error) {
      console.error(error);
      window.alert(shareUrl);
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
          <div className="hero-controls">
            <div className="view-mode-toggle" aria-label={uiText.labels.viewMode} role="group">
              <button
                className={`secondary-button toggle-button ${!isPublicView ? 'active' : ''}`.trim()}
                onClick={() => {
                  if (sessionState.isAdmin) {
                    setViewMode('admin');
                    return;
                  }

                  setShowAdminLogin(true);
                }}
                type="button"
                aria-pressed={!isPublicView}
              >
                <LockKeyhole size={16} />
                {uiText.buttons.adminView}
              </button>
              <button
                className={`secondary-button toggle-button ${isPublicView ? 'active' : ''}`.trim()}
                onClick={() => setViewMode('public')}
                type="button"
                aria-pressed={isPublicView}
              >
                <Smartphone size={16} />
                {uiText.buttons.publicView}
              </button>
            </div>
            {sessionState.isAdmin ? (
              <button className="secondary-button install-button" onClick={handleAdminLogout} type="button">
                <LogOut size={16} />
                {uiText.buttons.logout}
              </button>
            ) : null}
            {installCtaMode !== 'hidden' ? (
              <button className="secondary-button install-button" onClick={handleInstallApp} type="button">
                <Download size={16} />
                {uiText.buttons.installApp}
              </button>
            ) : null}
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
          <section className="hero-card rules-panel interactive-surface">
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

          <section className="hero-card interactive-surface">
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

      {isMobileViewport ? (
        <div className="section-drawer-entry">
          <button
            ref={sectionDrawerTriggerRef}
            aria-controls="section-drawer"
            aria-expanded={isSectionDrawerOpen}
            aria-label={appText.shell.navigation.openButton}
            className="secondary-button section-drawer-trigger"
            onClick={() => setIsSectionDrawerOpen(true)}
            type="button"
          >
            <Menu size={18} />
            {appText.shell.navigation.openButton}
          </button>
        </div>
      ) : (
        <nav aria-label={appText.shell.navigation.ariaLabel} className="section-nav panel">
          <div className="section-nav-list">
            {sectionNavigationItems.map((item) => (
              <button
                key={item.id}
                aria-pressed={activeSectionId === item.id}
                className={`secondary-button section-nav-button ${activeSectionId === item.id ? 'active' : ''}`.trim()}
                onClick={() => navigateToSection(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <div aria-hidden="true" className="section-nav-boundary" ref={sectionNavigationBoundaryRef} />

      <main className="dashboard-grid">
        <section className="content-column">
          <section className="calendar-panel" id="calendar-section">
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
                      className={`calendar-card interactive-surface ${
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

          <section className="panel" id="user-kpi-section">
            <div className="panel-head">
              <div className="section-title">
                <BarChart3 size={20} />
                <h2>{uiText.headings.userKpi}</h2>
              </div>
              <div className="insights-picker">
                <label htmlFor="insights-user-selector">{uiText.labels.userKpiSelector}</label>
                <select
                  id="insights-user-selector"
                  value={selectedInsightsUserName}
                  onChange={(event) => setSelectedInsightsUser(event.target.value)}
                >
                  {users.map((user) => (
                    <option key={`insights-${user.name}`} value={user.name}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedKpiSummary ? (
              <div className="kpi-grid" data-testid="user-kpi-dashboard">
                <article className="kpi-card interactive-surface">
                  <strong>{selectedKpiSummary.seasonPoints}</strong>
                  <span>{uiText.labels.seasonPoints}</span>
                </article>
                <article className="kpi-card interactive-surface">
                  <strong>{formatAverageValue(selectedKpiSummary.averagePosition, 1)}</strong>
                  <span>{uiText.labels.averagePosition}</span>
                </article>
                <article className="kpi-card interactive-surface">
                  <strong>{selectedKpiSummary.poleAccuracy}%</strong>
                  <span>{uiText.labels.poleAccuracy}</span>
                </article>
                <article className="kpi-card interactive-surface">
                  <strong>{formatAverageValue(selectedKpiSummary.averagePointsPerRace, 2)}</strong>
                  <span>{uiText.labels.averagePointsPerRace}</span>
                </article>
              </div>
            ) : (
              <p className="empty-copy">{uiText.history.analyticsEmpty}</p>
            )}
          </section>

          <section className="panel analytics-panel" id="user-analytics-section">
            <div className="section-title">
              <BarChart3 size={20} />
              <h2>{uiText.headings.userAnalytics}</h2>
            </div>
            {selectedAnalyticsSummary ? (
              <>
                <div className="analytics-summary-grid">
                  <article className="analytics-card interactive-surface">
                    <span className="analytics-label">{uiText.labels.bestWeekend}</span>
                    <strong>{selectedAnalyticsSummary.bestWeekend?.gpName ?? uiText.history.unknownDriver}</strong>
                    <small>
                      {selectedAnalyticsSummary.bestWeekend?.points ?? 0} {uiText.pointsSuffix}
                    </small>
                  </article>
                  <article className="analytics-card interactive-surface">
                    <span className="analytics-label">{uiText.labels.worstWeekend}</span>
                    <strong>{selectedAnalyticsSummary.worstWeekend?.gpName ?? uiText.history.unknownDriver}</strong>
                    <small>
                      {selectedAnalyticsSummary.worstWeekend?.points ?? 0} {uiText.pointsSuffix}
                    </small>
                  </article>
                  <article className="analytics-card interactive-surface">
                    <span className="analytics-label">{uiText.labels.mostPickedDriver}</span>
                    <strong>{formatTrendDriver(selectedAnalyticsSummary.mostPickedDriverId)}</strong>
                    <small>{selectedInsightsUserName}</small>
                  </article>
                </div>

                <div className="analytics-columns">
                  <div className="analytics-subpanel interactive-surface">
                    <h3>{uiText.labels.fieldAccuracy}</h3>
                    <div className="field-accuracy-list">
                      {selectedAnalyticsSummary.fieldAccuracy.map((entry) => (
                        <div key={`${selectedAnalyticsSummary.userName}-${entry.field}`} className="field-accuracy-row">
                          <span>{predictionLabels[entry.field]}</span>
                          <strong>{entry.accuracy}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="analytics-subpanel interactive-surface">
                    <h3>{uiText.labels.pointsTrend}</h3>
                    {selectedAnalyticsSummary.trend.length > 0 ? (
                      <div className="trend-chart" data-testid="user-points-trend">
                        {selectedAnalyticsSummary.trend.map((point) => {
                          const maxTrendValue = Math.max(
                            ...selectedAnalyticsSummary.trend.map((trendPoint) => trendPoint.points),
                            1,
                          );

                          return (
                            <div key={`${selectedAnalyticsSummary.userName}-${point.gpName}`} className="trend-bar-group">
                              <div className="trend-bar-shell">
                                <span
                                  className="trend-bar"
                                  style={{ height: `${Math.max((point.points / maxTrendValue) * 100, 8)}%` }}
                                />
                              </div>
                              <strong>{point.points}</strong>
                              <span>{point.gpName}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="empty-copy">{uiText.history.analyticsEmpty}</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="empty-copy">{uiText.history.analyticsEmpty}</p>
            )}
          </section>

          <SeasonAnalysisPanel
            analyticsEmptyLabel={uiText.history.analyticsEmpty}
            emptyOptionLabel={uiText.placeholders.emptyOption}
            isPublicView={isPublicView}
            onShare={handleShareCurrentView}
            predictionLabels={predictionLabels}
            selectedRaceMeetingName={selectedRace?.meetingName ?? ''}
            selectedRaceTrackOutlineUrl={selectedRace?.trackOutlineUrl ?? ''}
            seasonAnalytics={seasonAnalytics}
          />

          <WeekendLivePanel
            getDriverName={getWeekendLiveDriverName}
            predictionFieldOrder={predictionFieldOrder}
            predictionLabels={predictionLabels}
            weekendComparison={weekendComparison}
          />

          {isPublicView ? (
            <PublicGuidePanel />
          ) : null}

          {!isPublicView ? (
          <section className="panel" id="predictions-section">
            <div className="panel-head">
              <div className="section-title">
                <User size={20} />
                <h2>
                  {uiText.headings.predictionEntry}
                </h2>
              </div>
            </div>

            {selectedRacePhase === 'live' ? (
              <p className="locked-banner">{uiText.calendar.raceInProgressLocked}</p>
            ) : null}
            {selectedRacePhase === 'finished' ? (
              <p className="locked-banner">{uiText.calendar.raceFinished}</p>
            ) : null}
            {predictionResultsStatusMessage ? (
              <p className="sidebar-note status-note">{predictionResultsStatusMessage}</p>
            ) : null}

            <div className="predictions-grid">
              {users.map((user) => (
                <article key={user.name} className="user-card interactive-surface">
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
                        disabled={predictionsLocked}
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
                disabled={predictionsLocked || Boolean(editingSession)}
              >
                <Trash2 size={16} />
                {uiText.buttons.clear}
              </button>
              <button
                className="primary-button"
                onClick={handleSavePredictions}
                type="button"
                disabled={predictionsLocked || Boolean(editingSession)}
              >
                <Save size={16} />
                {uiText.buttons.savePredictions}
              </button>
            </div>
          </section>
          ) : (
            <section className="panel public-readonly-panel" id="predictions-section">
              <div className="section-title">
                <User size={20} />
                <h2>{uiText.headings.predictionEntry}</h2>
              </div>
              <p className="locked-banner">{uiText.history.publicReadonly}</p>
              <div className="predictions-grid readonly-grid">
                {users.map((user) => (
                  <article key={`readonly-${user.name}`} className="user-card readonly-card interactive-surface">
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
                    <div className="readonly-picks">
                      {trackedFields.map((field) => (
                        <div key={`readonly-${user.name}-${field}`} className="spotlight-row">
                          <span>{predictionLabels[field]}</span>
                          <strong>{getDriverDisplayNameById(drivers, user.predictions[field], uiText.placeholders.emptyOption)}</strong>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {!isPublicView ? (
          <section className="panel accent-panel" id="results-section">
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
                {renderSelectedRaceTrackMap()}
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
          ) : null}

          <HistoryArchivePanel
            editingSession={editingSession}
            expandedHistoryKey={expandedHistoryKey}
            filteredHistoryEntries={filteredHistoryEntries}
            getHistoryFieldHitLabel={getHistoryFieldHitLabel}
            getHistoryKey={getExpandedHistoryKey}
            historyEmptyLabel={uiText.history.empty}
            historySearch={historySearch}
            historyUserFilter={historyUserFilter}
            isPublicView={isPublicView}
            onDeleteHistoryRace={handleDeleteHistoryRace}
            onEditHistoryRace={handleEditHistoryRace}
            onHistorySearchChange={setHistorySearch}
            onHistoryUserFilterChange={setHistoryUserFilter}
            onToggleExpanded={setExpandedHistoryKey}
            pointsSuffix={uiText.pointsSuffix}
            predictionFieldOrder={predictionFieldOrder}
            predictionLabels={predictionLabels}
            renderHistoryResults={renderHistoryResults}
            unknownDriverLabel={uiText.history.unknownDriver}
            userDisplayNameForWinner={getHistoryWinnerDriverName}
            users={users}
          />
        </section>
      </main>

      {isMobileViewport && isSectionDrawerOpen ? (
        <div
          className="section-drawer-backdrop"
          role="presentation"
          onClick={() => closeSectionDrawer({ restoreFocus: true })}
        >
          <div
            ref={sectionDrawerRef}
            aria-label={appText.shell.navigation.ariaLabel}
            className="section-drawer"
            id="section-drawer"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-drawer-head">
              <p className="section-drawer-title">{appText.shell.navigation.ariaLabel}</p>
              <button
                aria-label={appText.shell.navigation.closeButton}
                className="secondary-button section-drawer-close"
                onClick={() => closeSectionDrawer({ restoreFocus: true })}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <nav aria-label={appText.shell.navigation.ariaLabel} className="section-drawer-nav">
              {sectionNavigationItems.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={activeSectionId === item.id}
                  className={`secondary-button section-drawer-item ${activeSectionId === item.id ? 'active' : ''}`.trim()}
                  onClick={() => navigateToSection(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      {isBackToTopVisible ? (
        <div
          className={`tooltip-wrapper back-to-top-tooltip ${isBackToTopTooltipVisible ? 'show-tooltip' : ''}`.trim()}
        >
          <button
            aria-label={appText.shell.navigation.backToTopButton}
            className="secondary-button back-to-top-button"
            onBlur={() => setIsBackToTopTooltipVisible(false)}
            onClick={scrollBackToTop}
            onFocus={() => setIsBackToTopTooltipVisible(true)}
            onMouseEnter={() => setIsBackToTopTooltipVisible(true)}
            onMouseLeave={() => setIsBackToTopTooltipVisible(false)}
            title={appText.shell.navigation.backToTopTooltip}
            type="button"
          >
            <ArrowUp aria-hidden="true" size={20} />
          </button>
          <div className="tooltip-text">{appText.shell.navigation.backToTopTooltip}</div>
        </div>
      ) : null}

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
    </div>
  );
}

export default App;
/* v8 ignore stop */
