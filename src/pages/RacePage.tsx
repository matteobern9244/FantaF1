import React from 'react';
import { ListChecks } from 'lucide-react';
import { appConfig } from '../constants';
import type {
  Driver,
  EditingSession,
  Prediction,
  PredictionKey,
  RaceWeekend,
} from '../types';
import { formatDriverDisplayName } from '../utils/drivers';
import WeekendLivePanel from '../components/WeekendLivePanel';
import PageSectionTabs from '../components/PageSectionTabs';

const { uiText } = appConfig;

interface WeekendComparisonEntry {
  liveTotal: number;
  matchedFields: PredictionKey[];
  projection: number;
  userName: string;
}

interface RacePageProps {
  activeSectionId: string;
  canAssignPoints: boolean;
  disabledReason: string | null;
  editingSession: EditingSession | null;
  getWeekendLiveDriverName: (field: PredictionKey) => string;
  isAdmin: boolean;
  onCalculateAndApplyPoints: () => void;
  onCancelEditRace: () => void;
  onShowTooltipChange: (show: boolean) => void;
  onUpdateRaceResult: (field: PredictionKey, value: string) => void;
  isSavingRaceResults: boolean;
  predictionFieldOrder: PredictionKey[];
  predictionLabels: Record<PredictionKey, string>;
  raceResults: Prediction;
  renderSelectedRaceTrackMap: (options?: { compact?: boolean }) => React.ReactNode;
  resultLabels: Record<PredictionKey, string>;
  selectedRace: RaceWeekend | null;
  showTooltip: boolean;
  sortedDrivers: Driver[];
  weekendComparison: WeekendComparisonEntry[];
  onSectionChange: (sectionId: string) => void;
}

function RacePage({
  activeSectionId,
  canAssignPoints,
  disabledReason,
  editingSession,
  getWeekendLiveDriverName,
  isAdmin,
  onCalculateAndApplyPoints,
  onCancelEditRace,
  onShowTooltipChange,
  onUpdateRaceResult,
  isSavingRaceResults,
  predictionFieldOrder,
  predictionLabels,
  raceResults,
  renderSelectedRaceTrackMap,
  resultLabels,
  selectedRace,
  showTooltip,
  sortedDrivers,
  weekendComparison,
  onSectionChange,
}: RacePageProps) {
  const visibleSectionId = isAdmin && activeSectionId === 'results-section'
    ? 'results-section'
    : 'weekend-live';

  return (
    <>
      <PageSectionTabs
        activeId={visibleSectionId}
        items={[
          { id: 'weekend-live', label: uiText.navigation.weekendLive },
          ...(isAdmin ? [{ id: 'results-section', label: uiText.navigation.results }] : []),
        ]}
        onSelect={onSectionChange}
        title={uiText.labels.sectionNavigation}
      />

      {visibleSectionId === 'weekend-live' ? (
        <WeekendLivePanel
          getDriverName={getWeekendLiveDriverName}
          predictionFieldOrder={predictionFieldOrder}
          predictionLabels={predictionLabels}
          weekendComparison={weekendComparison}
        />
      ) : null}

      {visibleSectionId === 'results-section' ? (
        <section className="panel accent-panel nav-section" id="results-section">
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
                  onChange={(event) => onUpdateRaceResult(field, event.target.value)}
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
              <button className="secondary-button" onClick={onCancelEditRace} type="button">
                {uiText.buttons.cancelEdit}
              </button>
            ) : null}
            <div
              className={`tooltip-wrapper ${!canAssignPoints ? 'disabled-wrapper' : ''} ${showTooltip && !canAssignPoints ? 'show-tooltip' : ''}`}
              onMouseEnter={() => onShowTooltipChange(true)}
              onMouseLeave={() => onShowTooltipChange(false)}
              onClick={() => {
                if (!canAssignPoints) {
                  onShowTooltipChange(!showTooltip);
                  setTimeout(() => onShowTooltipChange(false), 3000);
                }
              }}
            >
              {!canAssignPoints && (
                <div className="tooltip-text">{disabledReason}</div>
              )}
              <button
                className="primary-button"
                onClick={onCalculateAndApplyPoints}
                type="button"
                disabled={isSavingRaceResults || !canAssignPoints}
              >
                {editingSession ? uiText.buttons.saveEditedRace : uiText.buttons.confirmResults}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

export default RacePage;
