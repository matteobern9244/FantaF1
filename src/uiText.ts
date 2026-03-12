import { appConfig } from './constants';
import type { DriverStanding, ConstructorStanding } from './types';

function formatUiText(template: string, replacements: Record<string, string | number>) {
  return Object.entries(replacements).reduce((value, [key, replacement]) => {
    return value.split(`{${key}}`).join(String(replacement));
  }, template);
}

const { points, uiText } = appConfig;

const appText = {
  shell: {
    loadingMessage: uiText.shell.loadingMessage,
    loadingTelemetryMessage: uiText.shell.loadingTelemetryMessage,
    loadingWeekendSetupMessage: uiText.shell.loadingWeekendSetupMessage,
    weekendStatus: {
      unavailable: uiText.shell.weekendStatusUnavailable,
      completed: uiText.shell.weekendStatusCompleted,
      live: uiText.shell.weekendStatusLive,
      open: uiText.shell.weekendStatusOpen,
    },
    navigation: {
      openButton: uiText.buttons.openSections,
      closeButton: uiText.buttons.closeSections,
      ariaLabel: uiText.labels.sectionNavigation,
      items: uiText.navigation,
    },
  },
  panels: {
    publicGuide: {
      title: uiText.panels.publicGuide.title,
      pointsLabel: uiText.panels.publicGuide.pointsLabel,
      pointsSuffix: uiText.pointsSuffix,
      pointsStrip: [
        { field: 'first', label: uiText.panels.publicGuide.pointsStripLabels.first, points: points.first },
        { field: 'second', label: uiText.panels.publicGuide.pointsStripLabels.second, points: points.second },
        { field: 'third', label: uiText.panels.publicGuide.pointsStripLabels.third, points: points.third },
        { field: 'pole', label: uiText.panels.publicGuide.pointsStripLabels.pole, points: points.pole },
      ],
      raceLockLabel: uiText.panels.publicGuide.raceLockLabel,
      raceLockValue: uiText.panels.publicGuide.raceLockValue,
      liveViewLabel: uiText.panels.publicGuide.liveViewLabel,
      liveViewValue: uiText.panels.publicGuide.liveViewValue,
      sprintLabel: uiText.panels.publicGuide.sprintLabel,
      sprintValue: uiText.panels.publicGuide.sprintValue,
    },
    weekendLive: {
      title: uiText.panels.weekendLive.title,
      liveTotal: (liveTotal: number) =>
        formatUiText(uiText.panels.weekendLive.liveTotalTemplate, { points: liveTotal }),
      confirmedMatches: (count: number) =>
        formatUiText(uiText.panels.weekendLive.confirmedMatchesTemplate, { count }),
    },
    weekendPulseHero: {
      title: uiText.panels.weekendPulseHero.title,
      statusLabel: uiText.panels.weekendPulseHero.statusLabel,
      countdownLabel: uiText.panels.weekendPulseHero.countdownLabel,
      availabilityLabel: uiText.panels.weekendPulseHero.availabilityLabel,
      availability: {
        complete: uiText.panels.weekendPulseHero.availabilityComplete,
        partial: uiText.panels.weekendPulseHero.availabilityPartial,
        pending: uiText.panels.weekendPulseHero.availabilityPending,
      },
    },
    seasonAnalysis: {
      title: uiText.panels.seasonAnalysis.title,
      leaderGap: (gap: number) =>
        formatUiText(uiText.panels.seasonAnalysis.leaderGapTemplate, { gap }),
      hitRate: (hitRate: number) =>
        formatUiText(uiText.panels.seasonAnalysis.hitRateTemplate, { hitRate }),
      consistency: (consistency: number) =>
        formatUiText(uiText.panels.seasonAnalysis.consistencyTemplate, { consistency }),
      cumulativeTrendTitle: uiText.panels.seasonAnalysis.cumulativeTrendTitle,
      latestGpTitle: uiText.panels.seasonAnalysis.latestGpTitle,
      latestGpLabel: uiText.panels.seasonAnalysis.latestGpLabel,
      winnerLabel: uiText.panels.seasonAnalysis.winnerLabel,
      swingLabel: uiText.panels.seasonAnalysis.swingLabel,
      decisivePickLabel: uiText.panels.seasonAnalysis.decisivePickLabel,
    },
    historyArchive: {
      title: uiText.panels.historyArchive.title,
      actualPodiumTitle: uiText.panels.historyArchive.actualPodiumTitle,
      userFilterLabel: uiText.panels.historyArchive.userFilterLabel,
      allUsersOption: uiText.panels.historyArchive.allUsersOption,
      searchLabel: uiText.panels.historyArchive.searchLabel,
      shownCount: (count: number) =>
        formatUiText(uiText.panels.historyArchive.shownCountTemplate, { count }),
      editButton: uiText.panels.historyArchive.editButton,
      deleteButton: uiText.panels.historyArchive.deleteButton,
      detailButton: (gpName: string) =>
        formatUiText(uiText.panels.historyArchive.detailButtonTemplate, { gpName }),
      detailTitle: uiText.panels.historyArchive.detailTitle,
    },
    publicStandings: {
      title: uiText.panels.publicStandings.title,
      driversTitle: uiText.panels.publicStandings.driversTitle,
      constructorsTitle: uiText.panels.publicStandings.constructorsTitle,
      updatedAtLabel: uiText.panels.publicStandings.updatedAtLabel,
      pointsLabel: (points: number) =>
        `${points} ${uiText.panels.publicStandings.pointsSuffix}`,
      emptyLabel: uiText.panels.publicStandings.emptyLabel,
      driverPositionLabel: (entry: DriverStanding) => `P${entry.position}`,
      constructorPositionLabel: (entry: ConstructorStanding) => `P${entry.position}`,
    },
  },
};

export { appText, formatUiText };
