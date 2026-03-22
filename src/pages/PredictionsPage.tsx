import React from 'react';
import { User, Trash2, Save } from 'lucide-react';
import { appConfig } from '../constants';
import { Driver, UserData, PredictionKey, RacePhase, Prediction, EditingSession } from '../types';
import { formatDriverDisplayName, getDriverDisplayNameById } from '../utils/drivers';
import { trackedFields } from '../utils/analytics';

const { points, uiText } = appConfig;

interface PredictionsPageProps {
  isPublicView: boolean;
  selectedRacePhase: RacePhase;
  predictionResultsStatusMessage: string | null;
  users: UserData[];
  calculatePotentialPoints: (prediction: Prediction) => number;
  predictionFieldOrder: PredictionKey[];
  predictionLabels: Record<PredictionKey, string>;
  updatePrediction: (userName: string, field: PredictionKey, driverId: string) => void;
  predictionsLocked: boolean;
  sortedDrivers: Driver[];
  drivers: Driver[];
  clearAllPredictions: () => void;
  handleSavePredictions: () => void;
  editingSession: EditingSession | null;
  resultLabels: Record<PredictionKey, string>;
  raceResults: Prediction;
  updateRaceResult: (field: PredictionKey, driverId: string) => void;
}

const PredictionsPage: React.FC<PredictionsPageProps> = ({
  isPublicView,
  selectedRacePhase,
  predictionResultsStatusMessage,
  users,
  calculatePotentialPoints,
  predictionFieldOrder,
  predictionLabels,
  updatePrediction,
  predictionsLocked,
  sortedDrivers,
  drivers,
  clearAllPredictions,
  handleSavePredictions,
  editingSession,
  resultLabels,
  raceResults,
  updateRaceResult,
}) => {
  if (isPublicView) {
    return (
      <section className="panel public-readonly-panel nav-section" id="predictions-section">
        <div className="section-title">
          <User size={20} />
          <h2>{uiText.headings.predictionEntry}</h2>
        </div>
        <p className="locked-banner">{uiText.history.publicReadonly}</p>
        <div className="predictions-grid readonly-grid">
          {users.map((user) => (
            <article key={`readonly-${user.name}`} className="user-card interactive-surface">
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
    );
  }

  return (
    <section className="panel nav-section" id="predictions-section">
      <div className="panel-head">
        <div className="section-title">
          <User size={20} />
          <h2>{uiText.headings.predictionEntry}</h2>
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

      <div className="results-grid">
        {predictionFieldOrder.map((field) => (
          <div key={`result-inline-${field}`} className="field-row">
            <label htmlFor={`result-${field}`}>{resultLabels[field]}</label>
            <select
              id={`result-${field}`}
              value={raceResults[field]}
              onChange={(event) => updateRaceResult(field, event.target.value)}
            >
              <option value="">{uiText.placeholders.emptyOption}</option>
              {sortedDrivers.map((driver) => (
                <option key={`result-inline-${driver.id}`} value={driver.id}>
                  {formatDriverDisplayName(driver.name)} ({driver.team})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

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
  );
};

export default PredictionsPage;
