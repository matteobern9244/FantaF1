import React from 'react';
import { StandingsPayload, UserData, PredictionKey, EditingSession, RaceRecord } from '../types';
import PublicStandingsPanel from '../components/PublicStandingsPanel';
import HistoryArchivePanel from '../components/HistoryArchivePanel';
import { appConfig } from '../constants';

const { uiText } = appConfig;

interface StandingsPageProps {
  isPublicView: boolean;
  activeSectionId: string;
  standings: StandingsPayload;
  editingSession: EditingSession | null;
  expandedHistoryKey: string;
  filteredHistoryEntries: Array<{ index: number; record: RaceRecord }>;
  getHistoryFieldHitLabel: (record: RaceRecord, userName: string, field: PredictionKey) => string;
  getHistoryKey: (entry: RaceRecord, index: number) => string;
  historySearch: string;
  historyUserFilter: string;
  onDeleteHistoryRace: (historyIndex: number) => void;
  onEditHistoryRace: (historyIndex: number) => void;
  onHistorySearchChange: (search: string) => void;
  onHistoryUserFilterChange: (filter: string) => void;
  onToggleExpanded: (key: string) => void;
  predictionFieldOrder: PredictionKey[];
  predictionLabels: Record<PredictionKey, string>;
  resolveHistoryPodium: (record: RaceRecord) => Array<{
    avatarUrl?: string;
    color?: string;
    driverName: string;
    position: 1 | 2 | 3;
  }>;
  userDisplayNameForWinner: (record: RaceRecord, userName: string) => string;
  users: UserData[];
}

const StandingsPage: React.FC<StandingsPageProps> = ({
  isPublicView,
  activeSectionId,
  standings,
  editingSession,
  expandedHistoryKey,
  filteredHistoryEntries,
  getHistoryFieldHitLabel,
  getHistoryKey,
  historySearch,
  historyUserFilter,
  onDeleteHistoryRace,
  onEditHistoryRace,
  onHistorySearchChange,
  onHistoryUserFilterChange,
  onToggleExpanded,
  predictionFieldOrder,
  predictionLabels,
  resolveHistoryPodium,
  userDisplayNameForWinner,
  users,
}) => {
  const visibleSectionId = activeSectionId === 'history-archive'
    ? 'history-archive'
    : 'public-standings';

  return (
    <>
      {isPublicView && visibleSectionId === 'public-standings' ? (
        <PublicStandingsPanel
          constructorStandings={standings.constructorStandings}
          driverStandings={standings.driverStandings}
          updatedAt={standings.updatedAt}
        />
      ) : null}

      {visibleSectionId === 'history-archive' ? (
        <HistoryArchivePanel
          editingSession={editingSession}
          expandedHistoryKey={expandedHistoryKey}
          filteredHistoryEntries={filteredHistoryEntries}
          getHistoryFieldHitLabel={getHistoryFieldHitLabel}
          getHistoryKey={getHistoryKey}
          historyEmptyLabel={uiText.history.empty}
          historySearch={historySearch}
          historyUserFilter={historyUserFilter}
          isPublicView={isPublicView}
          onDeleteHistoryRace={onDeleteHistoryRace}
          onEditHistoryRace={onEditHistoryRace}
          onHistorySearchChange={onHistorySearchChange}
          onHistoryUserFilterChange={onHistoryUserFilterChange}
          onToggleExpanded={onToggleExpanded}
          pointsSuffix={uiText.pointsSuffix}
          predictionFieldOrder={predictionFieldOrder}
          predictionLabels={predictionLabels}
          resolveHistoryPodium={resolveHistoryPodium}
          unknownDriverLabel={uiText.history.unknownDriver}
          userDisplayNameForWinner={userDisplayNameForWinner}
          users={users}
        />
      ) : null}
    </>
  );
};

export default StandingsPage;
