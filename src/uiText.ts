import { appConfig } from './constants';

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
      backToTopButton: uiText.buttons.backToTop,
      ariaLabel: uiText.labels.sectionNavigation,
      items: uiText.navigation,
    },
  },
  panels: {
    publicGuide: {
      title: uiText.panels.publicGuide.title,
      pointsLabel: uiText.panels.publicGuide.pointsLabel,
      pointsSummary: formatUiText(uiText.panels.publicGuide.pointsSummaryTemplate, {
        first: points.first,
        second: points.second,
        third: points.third,
        pole: points.pole,
        pointsSuffix: uiText.pointsSuffix,
      }),
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
      shareButton: uiText.panels.seasonAnalysis.shareButton,
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
  },
};

export { appText, formatUiText };
