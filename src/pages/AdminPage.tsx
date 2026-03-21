import React from 'react';
import { LockKeyhole, ListChecks } from 'lucide-react';
import { appConfig } from '../constants';
import { SessionState, RaceWeekend, PredictionKey, Prediction, Driver, EditingSession } from '../types';
import { formatDriverDisplayName } from '../utils/drivers';

const { uiText } = appConfig;

interface AdminPageProps {
  sessionState: SessionState;
  adminPassword: string;
  onAdminPasswordChange: (password: string) => void;
  onAdminLogin: () => void;
  adminLoginError: string | null;
  editingSession: EditingSession | null;
  selectedRace: RaceWeekend | null;
  renderSelectedRaceTrackMap: (options?: { compact?: boolean }) => React.ReactNode;
  predictionFieldOrder: PredictionKey[];
  resultLabels: Record<PredictionKey, string>;
  raceResults: Prediction;
  onUpdateRaceResult: (field: PredictionKey, driverId: string) => void;
  sortedDrivers: Driver[];
  onCancelEditRace: () => void;
  canAssignPoints: boolean;
  showTooltip: boolean;
  onShowTooltipChange: (show: boolean) => void;
  disabledReason: string | null;
  onCalculateAndApplyPoints: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({
  sessionState,
  adminPassword,
  onAdminPasswordChange,
  onAdminLogin,
  adminLoginError,
  editingSession,
  selectedRace,
  renderSelectedRaceTrackMap,
  predictionFieldOrder,
  resultLabels,
  raceResults,
  onUpdateRaceResult,
  sortedDrivers,
  onCancelEditRace,
  canAssignPoints,
  showTooltip,
  onShowTooltipChange,
  disabledReason,
  onCalculateAndApplyPoints,
}) => {
  if (!sessionState.isAdmin) {
    return (
      <section className="panel nav-section" id="admin-section">
        <div className="admin-login-inline">
          <div className="section-title">
            <LockKeyhole size={20} />
            <h2 id="admin-login-title">{uiText.headings.adminAccess}</h2>
          </div>
          <div className="field-row">
            <label htmlFor="admin-password-inline">{uiText.buttons.adminView}</label>
            <input
              id="admin-password-inline"
              className="auth-input"
              type="password"
              value={adminPassword}
              onChange={(event) => onAdminPasswordChange(event.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAdminLogin()}
            />
          </div>
          {adminLoginError ? <p className="locked-banner">{adminLoginError}</p> : null}
          <div className="results-actions">
            <button className="primary-button" onClick={onAdminLogin} type="button">
              <LockKeyhole size={16} />
              {uiText.buttons.adminView}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel nav-section" id="admin-section">
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
            <button className="primary-button" onClick={onCalculateAndApplyPoints} type="button" disabled={!canAssignPoints}>
              {editingSession ? uiText.buttons.saveEditedRace : uiText.buttons.confirmResults}
            </button>
          </div>
        </div>
      </section>
    </section>
  );
};

export default AdminPage;
