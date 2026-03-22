/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminPage from '../src/pages/AdminPage';
import AnalysisPage from '../src/pages/AnalysisPage';
import DashboardPage from '../src/pages/DashboardPage';
import PredictionsPage from '../src/pages/PredictionsPage';
import StandingsPage from '../src/pages/StandingsPage';
import { appConfig } from '../src/constants';
import { appText } from '../src/uiText';
import { createEmptyPrediction } from '../src/utils/game';
import type {
  Driver,
  PredictionKey,
  RaceRecord,
  RaceWeekend,
  SessionState,
  UserAnalyticsSummary,
  UserData,
  UserKpiSummary,
} from '../src/types';

const predictionFieldOrder: PredictionKey[] = ['first', 'second', 'third', 'pole'];
const resultLabels: Record<PredictionKey, string> = {
  first: 'Risultato 1°',
  second: 'Risultato 2°',
  third: 'Risultato 3°',
  pole: 'Pole / sprint reale',
};
const { uiText } = appConfig;
const predictionLabels: Record<PredictionKey, string> = {
  first: 'Vincitore gara',
  second: 'Secondo classificato',
  third: 'Terzo classificato',
  pole: 'Pole position',
};
const drivers: Driver[] = [
  { id: 'ver', name: 'Max Verstappen', team: 'Red Bull', color: '#1e41ff' },
  { id: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', color: '#dc0000' },
];
const selectedRace: RaceWeekend = {
  meetingKey: 'australia-2026',
  meetingName: 'Australia',
  grandPrixTitle: 'Australian Grand Prix 2026',
  roundNumber: 1,
  dateRangeLabel: '13-15 Mar 2026',
  detailUrl: 'https://example.com/australia',
  heroImageUrl: 'https://example.com/australia.webp',
  trackOutlineUrl: 'https://example.com/australia-track.webp',
  isSprintWeekend: false,
};
const users: UserData[] = [
  { name: 'Marco', predictions: createEmptyPrediction(), points: 44 },
  { name: 'Luca', predictions: createEmptyPrediction(), points: 39 },
];
const historyRecord: RaceRecord = {
  gpName: 'Australian Grand Prix 2026',
  meetingKey: 'australia-2026',
  date: '15/03/2026',
  results: createEmptyPrediction(),
  userPredictions: {
    Marco: {
      prediction: createEmptyPrediction(),
      pointsEarned: 12,
    },
  },
};

describe('route page wrappers', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('renders the inline admin login for public sessions and submits with Enter', () => {
    const onAdminPasswordChange = vi.fn();
    const onAdminLogin = vi.fn();
    const sessionState: SessionState = { isAdmin: false, defaultViewMode: 'public' };

    render(
      <AdminPage
        sessionState={sessionState}
        adminPassword=""
        onAdminPasswordChange={onAdminPasswordChange}
        onAdminLogin={onAdminLogin}
        adminLoginError="Password non valida"
        editingSession={null}
        selectedRace={null}
        renderSelectedRaceTrackMap={() => null}
        predictionFieldOrder={predictionFieldOrder}
        resultLabels={resultLabels}
        raceResults={createEmptyPrediction()}
        onUpdateRaceResult={() => {}}
        sortedDrivers={drivers}
        onCancelEditRace={() => {}}
        canAssignPoints={false}
        showTooltip={false}
        onShowTooltipChange={() => {}}
        disabledReason={null}
        onCalculateAndApplyPoints={() => {}}
      />,
    );

    const passwordInput = screen.getByLabelText(uiText.buttons.adminView);
    fireEvent.change(passwordInput, { target: { value: 'super-secret' } });
    fireEvent.keyDown(passwordInput, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: uiText.buttons.adminView }));

    expect(onAdminPasswordChange).toHaveBeenCalledWith('super-secret');
    expect(onAdminLogin).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Password non valida')).toBeInTheDocument();
  });

  it('renders admin result controls, editing actions, and the disabled tooltip branch', () => {
    vi.useFakeTimers();
    const onUpdateRaceResult = vi.fn();
    const onCancelEditRace = vi.fn();
    const onShowTooltipChange = vi.fn();
    const onCalculateAndApplyPoints = vi.fn();
    const sessionState: SessionState = { isAdmin: true, defaultViewMode: 'admin' };

    render(
      <AdminPage
        sessionState={sessionState}
        adminPassword=""
        onAdminPasswordChange={() => {}}
        onAdminLogin={() => {}}
        adminLoginError={null}
        editingSession={{ historyIndex: 0, record: historyRecord }}
        selectedRace={selectedRace}
        renderSelectedRaceTrackMap={() => <div>Track map</div>}
        predictionFieldOrder={predictionFieldOrder}
        resultLabels={resultLabels}
        raceResults={{ first: 'ham', second: '', third: '', pole: '' }}
        onUpdateRaceResult={onUpdateRaceResult}
        sortedDrivers={drivers}
        onCancelEditRace={onCancelEditRace}
        canAssignPoints={false}
        showTooltip={false}
        onShowTooltipChange={onShowTooltipChange}
        disabledReason="Completa i risultati"
        onCalculateAndApplyPoints={onCalculateAndApplyPoints}
      />,
    );

    expect(screen.getByRole('heading', { name: appText.headings.results })).toBeInTheDocument();
    expect(screen.getByText('Australian Grand Prix 2026')).toBeInTheDocument();
    expect(screen.getByText('Track map')).toBeInTheDocument();
    expect(screen.getByText(appText.history.editingLabel)).toBeInTheDocument();
    expect(screen.getByText('Completa i risultati')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Risultato 1°'), { target: { value: 'ver' } });
    fireEvent.click(screen.getByRole('button', { name: uiText.buttons.cancelEdit }));

    const tooltipWrapper = screen.getByText('Completa i risultati').closest('.tooltip-wrapper');
    expect(tooltipWrapper).not.toBeNull();

    fireEvent.mouseEnter(tooltipWrapper as HTMLElement);
    fireEvent.mouseLeave(tooltipWrapper as HTMLElement);
    fireEvent.click(tooltipWrapper as HTMLElement);
    vi.advanceTimersByTime(3000);

    expect(onUpdateRaceResult).toHaveBeenCalledWith('first', 'ver');
    expect(onCancelEditRace).toHaveBeenCalledTimes(1);
    expect(onShowTooltipChange).toHaveBeenCalledWith(true);
    expect(onShowTooltipChange).toHaveBeenLastCalledWith(false);
    expect(onCalculateAndApplyPoints).not.toHaveBeenCalled();
  });

  it('renders populated analysis analytics and KPI content and propagates the user selector', () => {
    const onSelectedInsightsUserChange = vi.fn();
    const selectedAnalyticsSummary: UserAnalyticsSummary = {
      userName: 'Marco',
      bestWeekend: { gpName: 'Australia', points: 21 },
      worstWeekend: { gpName: 'Monaco', points: 4 },
      mostPickedDriverId: 'ver',
      fieldAccuracy: [{ field: 'first', hits: 3, total: 5, accuracy: 60 }],
      trend: [{ gpName: 'Australia', points: 21 }],
      cumulativeTrend: [{ gpName: 'Australia', points: 21 }],
      pointsByField: { first: 10, second: 5, third: 3, pole: 3 },
      weekendsAboveLeader: 1,
    };
    const selectedKpiSummary: UserKpiSummary = {
      userName: 'Marco',
      seasonPoints: 44,
      averagePosition: 1.5,
      poleAccuracy: 50,
      averagePointsPerRace: 11,
      racesCount: 4,
      weekendWins: 2,
      podiums: 3,
      averageLeaderDelta: 0.5,
      totalHitRate: 62,
    };

    const { rerender } = render(
      <AnalysisPage
        seasonAnalytics={{
          comparison: [],
          leaderName: 'Marco',
          narratives: [],
          recap: null,
        }}
        predictionLabels={predictionLabels}
        selectedAnalyticsSummary={selectedAnalyticsSummary}
        formatTrendDriver={(id) => (id === 'ver' ? 'Max Verstappen' : 'Pilota sconosciuto')}
        selectedInsightsUserName="Marco"
        formatAverageValue={(value, digits = 0) =>
          value === null ? 'N/D' : value.toFixed(digits)
        }
        selectedKpiSummary={selectedKpiSummary}
        users={users}
        onSelectedInsightsUserChange={onSelectedInsightsUserChange}
        activeSectionId="user-analytics-section"
      />,
    );

    expect(screen.getAllByText('Australia').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Monaco')).toBeInTheDocument();
    expect(screen.getByText('Max Verstappen')).toBeInTheDocument();
    expect(screen.getByTestId('user-points-trend')).toBeInTheDocument();

    rerender(
      <AnalysisPage
        seasonAnalytics={{
          comparison: [],
          leaderName: 'Marco',
          narratives: [],
          recap: null,
        }}
        predictionLabels={predictionLabels}
        selectedAnalyticsSummary={selectedAnalyticsSummary}
        formatTrendDriver={(id) => (id === 'ver' ? 'Max Verstappen' : 'Pilota sconosciuto')}
        selectedInsightsUserName="Marco"
        formatAverageValue={(value, digits = 0) =>
          value === null ? 'N/D' : value.toFixed(digits)
        }
        selectedKpiSummary={selectedKpiSummary}
        users={users}
        onSelectedInsightsUserChange={onSelectedInsightsUserChange}
        activeSectionId="user-kpi-section"
      />,
    );

    expect(screen.getByTestId('user-kpi-dashboard')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(appText.labels.userKpiSelector), {
      target: { value: 'Luca' },
    });

    expect(onSelectedInsightsUserChange).toHaveBeenCalledWith('Luca');
  });

  it('renders SeasonAnalysisPanel when activeSectionId is season-analysis', () => {
    render(
      <AnalysisPage
        seasonAnalytics={{
          comparison: [],
          leaderName: 'Marco',
          narratives: [],
          recap: null,
        }}
        predictionLabels={predictionLabels}
        selectedAnalyticsSummary={null}
        formatTrendDriver={() => 'Pilota sconosciuto'}
        selectedInsightsUserName="Marco"
        formatAverageValue={() => 'N/D'}
        selectedKpiSummary={null}
        users={users}
        onSelectedInsightsUserChange={() => {}}
        activeSectionId="season-analysis"
      />,
    );

    expect(screen.getByTestId('season-cumulative-trend')).toBeInTheDocument();
  });

  it('renders the analyticsEmpty copy and hides the trend chart when trend is an empty array', () => {
    const selectedAnalyticsSummary: UserAnalyticsSummary = {
      userName: 'Marco',
      bestWeekend: { gpName: 'Australia', points: 21 },
      worstWeekend: { gpName: 'Monaco', points: 4 },
      mostPickedDriverId: 'ver',
      fieldAccuracy: [{ field: 'first', hits: 3, total: 5, accuracy: 60 }],
      trend: [],
      cumulativeTrend: [],
      pointsByField: { first: 10, second: 5, third: 3, pole: 3 },
      weekendsAboveLeader: 1,
    };
    const selectedKpiSummary: UserKpiSummary = {
      userName: 'Marco',
      seasonPoints: 44,
      averagePosition: 1.5,
      poleAccuracy: 50,
      averagePointsPerRace: 11,
      racesCount: 4,
      weekendWins: 2,
      podiums: 3,
      averageLeaderDelta: 0.5,
      totalHitRate: 62,
    };

    render(
      <AnalysisPage
        seasonAnalytics={{
          comparison: [],
          leaderName: 'Marco',
          narratives: [],
          recap: null,
        }}
        predictionLabels={predictionLabels}
        selectedAnalyticsSummary={selectedAnalyticsSummary}
        formatTrendDriver={(id) => (id === 'ver' ? 'Max Verstappen' : 'Pilota sconosciuto')}
        selectedInsightsUserName="Marco"
        formatAverageValue={(value, digits = 0) =>
          value === null ? 'N/D' : value.toFixed(digits)
        }
        selectedKpiSummary={selectedKpiSummary}
        users={users}
        onSelectedInsightsUserChange={() => {}}
        activeSectionId="user-analytics-section"
      />,
    );

    expect(screen.getByText(uiText.history.analyticsEmpty)).toBeInTheDocument();
    expect(screen.queryByTestId('user-points-trend')).not.toBeInTheDocument();
  });

  it('keeps the analysis empty states and standings history shell aligned with the selected view', () => {
    const { rerender } = render(
      <AnalysisPage
        seasonAnalytics={{
          comparison: [],
          leaderName: '',
          narratives: [],
          recap: null,
        }}
        predictionLabels={predictionLabels}
        selectedAnalyticsSummary={null}
        formatTrendDriver={() => 'Pilota sconosciuto'}
        selectedInsightsUserName="Marco"
        formatAverageValue={() => 'N/D'}
        selectedKpiSummary={null}
        users={users}
        onSelectedInsightsUserChange={() => {}}
        activeSectionId="user-analytics-section"
      />,
    );

    expect(screen.getByText(appText.history.analyticsEmpty)).toBeInTheDocument();

    rerender(
      <AnalysisPage
        seasonAnalytics={{
          comparison: [],
          leaderName: '',
          narratives: [],
          recap: null,
        }}
        predictionLabels={predictionLabels}
        selectedAnalyticsSummary={null}
        formatTrendDriver={() => 'Pilota sconosciuto'}
        selectedInsightsUserName="Marco"
        formatAverageValue={() => 'N/D'}
        selectedKpiSummary={null}
        users={users}
        onSelectedInsightsUserChange={() => {}}
        activeSectionId="user-kpi-section"
      />,
    );

    expect(screen.getByText(appText.history.analyticsEmpty)).toBeInTheDocument();

    rerender(
      <StandingsPage
        isPublicView={true}
        activeSectionId="public-standings"
        standings={{
          constructorStandings: [{ position: 1, team: 'Ferrari', points: 44 }],
          driverStandings: [{ position: 1, driverId: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', points: 25 }],
          updatedAt: '2026-03-15T10:00:00.000Z',
        }}
        editingSession={null}
        expandedHistoryKey=""
        filteredHistoryEntries={[{ index: 0, record: historyRecord }]}
        getHistoryFieldHitLabel={() => 'N/D'}
        getHistoryKey={() => 'history-0'}
        historySearch=""
        historyUserFilter="all"
        onDeleteHistoryRace={() => {}}
        onEditHistoryRace={() => {}}
        onHistorySearchChange={() => {}}
        onHistoryUserFilterChange={() => {}}
        onToggleExpanded={() => {}}
        predictionFieldOrder={predictionFieldOrder}
        predictionLabels={predictionLabels}
        resolveHistoryPodium={() => []}
        userDisplayNameForWinner={() => 'Marco'}
        users={users}
      />,
    );

    expect(screen.getByText('Lewis Hamilton')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: appText.panels.publicStandings.title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: appText.panels.historyArchive.title })).not.toBeInTheDocument();

    rerender(
      <StandingsPage
        isPublicView={false}
        activeSectionId="history-archive"
        standings={{
          constructorStandings: [{ position: 1, team: 'Ferrari', points: 44 }],
          driverStandings: [{ position: 1, driverId: 'ham', name: 'Lewis Hamilton', team: 'Ferrari', points: 25 }],
          updatedAt: '2026-03-15T10:00:00.000Z',
        }}
        editingSession={null}
        expandedHistoryKey=""
        filteredHistoryEntries={[{ index: 0, record: historyRecord }]}
        getHistoryFieldHitLabel={() => 'N/D'}
        getHistoryKey={() => 'history-0'}
        historySearch=""
        historyUserFilter="all"
        onDeleteHistoryRace={() => {}}
        onEditHistoryRace={() => {}}
        onHistorySearchChange={() => {}}
        onHistoryUserFilterChange={() => {}}
        onToggleExpanded={() => {}}
        predictionFieldOrder={predictionFieldOrder}
        predictionLabels={predictionLabels}
        resolveHistoryPodium={() => []}
        userDisplayNameForWinner={() => 'Marco'}
        users={users}
      />,
    );

    expect(screen.queryByText('Lewis Hamilton')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: appText.panels.historyArchive.title })).toBeInTheDocument();
  });

  it('renders the tooltip-text div and show-tooltip class when showTooltip=true and canAssignPoints=false', () => {
    const sessionState: SessionState = { isAdmin: true, defaultViewMode: 'admin' };

    render(
      <AdminPage
        sessionState={sessionState}
        adminPassword=""
        onAdminPasswordChange={() => {}}
        onAdminLogin={() => {}}
        adminLoginError={null}
        editingSession={null}
        selectedRace={selectedRace}
        renderSelectedRaceTrackMap={() => null}
        predictionFieldOrder={predictionFieldOrder}
        resultLabels={resultLabels}
        raceResults={createEmptyPrediction()}
        onUpdateRaceResult={() => {}}
        sortedDrivers={drivers}
        onCancelEditRace={() => {}}
        canAssignPoints={false}
        showTooltip={true}
        onShowTooltipChange={() => {}}
        disabledReason="Risultati incompleti"
        onCalculateAndApplyPoints={() => {}}
      />,
    );

    const tooltipText = screen.getByText('Risultati incompleti');
    expect(tooltipText).toBeInTheDocument();
    expect(tooltipText.className).toContain('tooltip-text');

    const tooltipWrapper = tooltipText.closest('.tooltip-wrapper');
    expect(tooltipWrapper).not.toBeNull();
    expect(tooltipWrapper!.className).toContain('show-tooltip');
  });

  it('renders the sprint weekend badge on a DashboardPage calendar card', () => {
    const sprintRace: RaceWeekend = {
      meetingKey: 'china-2026',
      meetingName: 'China',
      grandPrixTitle: 'Chinese Grand Prix 2026',
      roundNumber: 2,
      dateRangeLabel: '20-22 Mar 2026',
      detailUrl: 'https://example.com/china',
      heroImageUrl: 'https://example.com/china.webp',
      trackOutlineUrl: 'https://example.com/china-track.webp',
      isSprintWeekend: true,
    };

    render(
      <DashboardPage
        sortedCalendar={[sprintRace]}
        selectedRace={sprintRace}
        handleRaceSelection={() => {}}
        editingSession={null}
        getWeekendLiveDriverName={() => ''}
        predictionFieldOrder={predictionFieldOrder}
        predictionLabels={predictionLabels}
        weekendComparison={[]}
        isPublicView={false}
        activeSectionId="calendar-section"
      />,
    );

    expect(screen.getByText(uiText.labels.calendarSprint)).toBeInTheDocument();
  });

  it('renders DashboardPage with selectedRace null covering the ?? branch and fires onChange and onClick handlers', () => {
    const handleRaceSelection = vi.fn();
    render(
      <DashboardPage
        sortedCalendar={[selectedRace]}
        selectedRace={null}
        handleRaceSelection={handleRaceSelection}
        editingSession={null}
        getWeekendLiveDriverName={() => ''}
        predictionFieldOrder={predictionFieldOrder}
        predictionLabels={predictionLabels}
        weekendComparison={[]}
        isPublicView={false}
        activeSectionId="calendar-section"
      />,
    );

    // selectedRace is null → value prop resolves via ?? '' (null-coalescing branch covered)
    const select = screen.getByLabelText(uiText.labels.selectedRace);

    // fire the onChange inline arrow function on the select
    fireEvent.change(select, { target: { value: 'australia-2026' } });
    expect(handleRaceSelection).toHaveBeenCalledWith('australia-2026');

    // fire the onClick inline arrow function on a calendar card button
    fireEvent.click(screen.getByRole('button', { name: /Australia/i }));
    expect(handleRaceSelection).toHaveBeenCalledWith('australia-2026');
  });

  it('renders PredictionsPage with isPublicView true showing the readonly panel', () => {
    render(
      <PredictionsPage
        isPublicView={true}
        selectedRacePhase="upcoming"
        predictionResultsStatusMessage={null}
        users={users}
        calculatePotentialPoints={() => 42}
        predictionFieldOrder={predictionFieldOrder}
        predictionLabels={predictionLabels}
        updatePrediction={() => {}}
        predictionsLocked={false}
        sortedDrivers={drivers}
        drivers={drivers}
        clearAllPredictions={() => {}}
        handleSavePredictions={() => {}}
        editingSession={null}
        resultLabels={resultLabels}
        raceResults={createEmptyPrediction()}
        updateRaceResult={() => {}}
      />,
    );

    expect(screen.getByText(uiText.history.publicReadonly)).toBeInTheDocument();
    // user cards are rendered in the readonly grid
    expect(screen.getByText('Marco')).toBeInTheDocument();
    expect(screen.getByText('Luca')).toBeInTheDocument();
  });

  it('fires the updateRaceResult and updatePrediction inline handlers on PredictionsPage', () => {
    const updateRaceResult = vi.fn();
    const updatePrediction = vi.fn();

    render(
      <PredictionsPage
        isPublicView={false}
        selectedRacePhase="upcoming"
        predictionResultsStatusMessage={null}
        users={users}
        calculatePotentialPoints={() => 0}
        predictionFieldOrder={predictionFieldOrder}
        predictionLabels={predictionLabels}
        updatePrediction={updatePrediction}
        predictionsLocked={false}
        sortedDrivers={drivers}
        drivers={drivers}
        clearAllPredictions={() => {}}
        handleSavePredictions={() => {}}
        editingSession={null}
        resultLabels={resultLabels}
        raceResults={createEmptyPrediction()}
        updateRaceResult={updateRaceResult}
      />,
    );

    // fire the (event) => updateRaceResult(...) inline handler
    fireEvent.change(screen.getByLabelText('Risultato 1°'), { target: { value: 'ver' } });
    expect(updateRaceResult).toHaveBeenCalledWith('first', 'ver');

    // fire the (event) => updatePrediction(...) inline handler for the first user/field combo
    // two users both have the same label; pick the first (Marco)
    const [firstPredictionSelect] = screen.getAllByLabelText('Vincitore gara (5 pt)');
    fireEvent.change(firstPredictionSelect, { target: { value: 'ham' } });
    expect(updatePrediction).toHaveBeenCalledWith('Marco', 'first', 'ham');
  });

  it('renders the live locked banner on PredictionsPage when selectedRacePhase is live', () => {
    render(
      <PredictionsPage
        isPublicView={false}
        selectedRacePhase="live"
        predictionResultsStatusMessage={null}
        users={users}
        calculatePotentialPoints={() => 0}
        predictionFieldOrder={predictionFieldOrder}
        predictionLabels={predictionLabels}
        updatePrediction={() => {}}
        predictionsLocked={true}
        sortedDrivers={drivers}
        drivers={drivers}
        clearAllPredictions={() => {}}
        handleSavePredictions={() => {}}
        editingSession={null}
        resultLabels={resultLabels}
        raceResults={createEmptyPrediction()}
        updateRaceResult={() => {}}
      />,
    );

    expect(screen.getByText(uiText.calendar.raceInProgressLocked)).toBeInTheDocument();
  });

  it('renders the finished banner on PredictionsPage when selectedRacePhase is finished', () => {
    render(
      <PredictionsPage
        isPublicView={false}
        selectedRacePhase="finished"
        predictionResultsStatusMessage={null}
        users={users}
        calculatePotentialPoints={() => 0}
        predictionFieldOrder={predictionFieldOrder}
        predictionLabels={predictionLabels}
        updatePrediction={() => {}}
        predictionsLocked={true}
        sortedDrivers={drivers}
        drivers={drivers}
        clearAllPredictions={() => {}}
        handleSavePredictions={() => {}}
        editingSession={null}
        resultLabels={resultLabels}
        raceResults={createEmptyPrediction()}
        updateRaceResult={() => {}}
      />,
    );

    expect(screen.getByText(uiText.calendar.raceFinished)).toBeInTheDocument();
  });

  it('renders AdminPage with canAssignPoints=true: tooltip-wrapper has no disabled-wrapper class and tooltip-text is absent', () => {
    const sessionState: SessionState = { isAdmin: true, defaultViewMode: 'admin' };

    render(
      <AdminPage
        sessionState={sessionState}
        adminPassword=""
        onAdminPasswordChange={() => {}}
        onAdminLogin={() => {}}
        adminLoginError={null}
        editingSession={null}
        selectedRace={selectedRace}
        renderSelectedRaceTrackMap={() => null}
        predictionFieldOrder={predictionFieldOrder}
        resultLabels={resultLabels}
        raceResults={createEmptyPrediction()}
        onUpdateRaceResult={() => {}}
        sortedDrivers={drivers}
        onCancelEditRace={() => {}}
        canAssignPoints={true}
        showTooltip={false}
        onShowTooltipChange={() => {}}
        disabledReason={null}
        onCalculateAndApplyPoints={() => {}}
      />,
    );

    const tooltipWrapper = document.querySelector('.tooltip-wrapper');
    expect(tooltipWrapper).not.toBeNull();
    expect(tooltipWrapper!.className).not.toContain('disabled-wrapper');
    expect(document.querySelector('.tooltip-text')).toBeNull();
  });

  it('renders AnalysisPage with bestWeekend=null and worstWeekend=null showing unknownDriver fallbacks', () => {
    const selectedAnalyticsSummary: UserAnalyticsSummary = {
      userName: 'Marco',
      bestWeekend: null,
      worstWeekend: null,
      mostPickedDriverId: 'ver',
      fieldAccuracy: [],
      trend: [{ gpName: 'Australia', points: 21 }],
      cumulativeTrend: [{ gpName: 'Australia', points: 21 }],
      pointsByField: { first: 10, second: 5, third: 3, pole: 3 },
      weekendsAboveLeader: 0,
    };
    const selectedKpiSummary: UserKpiSummary = {
      userName: 'Marco',
      seasonPoints: 44,
      averagePosition: 1.5,
      poleAccuracy: 50,
      averagePointsPerRace: 11,
      racesCount: 4,
      weekendWins: 2,
      podiums: 3,
      averageLeaderDelta: 0.5,
      totalHitRate: 62,
    };

    render(
      <AnalysisPage
        seasonAnalytics={{
          comparison: [],
          leaderName: 'Marco',
          narratives: [],
          recap: null,
        }}
        predictionLabels={predictionLabels}
        selectedAnalyticsSummary={selectedAnalyticsSummary}
        formatTrendDriver={(id) => (id === 'ver' ? 'Max Verstappen' : 'Pilota sconosciuto')}
        selectedInsightsUserName="Marco"
        formatAverageValue={(value, digits = 0) =>
          value === null ? 'N/D' : value.toFixed(digits)
        }
        selectedKpiSummary={selectedKpiSummary}
        users={users}
        onSelectedInsightsUserChange={() => {}}
        activeSectionId="user-analytics-section"
      />,
    );

    expect(screen.getAllByText(uiText.history.unknownDriver).length).toBeGreaterThanOrEqual(2);
  });
});
