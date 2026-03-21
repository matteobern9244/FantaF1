import React from 'react';
import { Flag } from 'lucide-react';
import { appConfig } from '../constants';
import { RaceWeekend, PredictionKey, EditingSession } from '../types';
import WeekendLivePanel from '../components/WeekendLivePanel';
import PublicGuidePanel from '../components/PublicGuidePanel';

const { uiText } = appConfig;

interface WeekendComparisonEntry {
  liveTotal: number;
  matchedFields: PredictionKey[];
  projection: number;
  userName: string;
}

interface DashboardPageProps {
  sortedCalendar: RaceWeekend[];
  selectedRace: RaceWeekend | null;
  handleRaceSelection: (meetingKey: string) => void;
  editingSession: EditingSession | null;
  getWeekendLiveDriverName: (field: PredictionKey) => string;
  predictionFieldOrder: PredictionKey[];
  predictionLabels: Record<PredictionKey, string>;
  weekendComparison: WeekendComparisonEntry[];
  isPublicView: boolean;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  sortedCalendar,
  selectedRace,
  handleRaceSelection,
  editingSession,
  getWeekendLiveDriverName,
  predictionFieldOrder,
  predictionLabels,
  weekendComparison,
  isPublicView,
}) => {
  return (
    <>
      <section className="calendar-panel nav-section" id="calendar-section">
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

      <WeekendLivePanel
        getDriverName={getWeekendLiveDriverName}
        predictionFieldOrder={predictionFieldOrder}
        predictionLabels={predictionLabels}
        weekendComparison={weekendComparison}
      />

      {isPublicView ? (
        <PublicGuidePanel />
      ) : null}
    </>
  );
};

export default DashboardPage;
