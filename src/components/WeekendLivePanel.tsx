import { Gauge } from 'lucide-react';
import type { PredictionKey } from '../types';
import { appText } from '../uiText';

interface WeekendComparisonEntry {
  liveTotal: number;
  matchedFields: PredictionKey[];
  projection: number;
  userName: string;
}

interface WeekendLivePanelProps {
  getDriverName: (field: PredictionKey) => string;
  predictionFieldOrder: PredictionKey[];
  predictionLabels: Record<PredictionKey, string>;
  weekendComparison: WeekendComparisonEntry[];
}

function WeekendLivePanel({
  getDriverName,
  predictionFieldOrder,
  predictionLabels,
  weekendComparison,
}: WeekendLivePanelProps) {
  const { weekendLive } = appText.panels;

  return (
    <section className="panel nav-section" id="weekend-live">
      <div className="section-title">
        <Gauge size={20} />
        <h2>{weekendLive.title}</h2>
      </div>
      <div className="analytics-summary-grid">
        {weekendComparison.map((entry) => (
          <article key={`weekend-${entry.userName}`} className="analytics-card interactive-surface">
            <span className="analytics-label">{entry.userName}</span>
            <strong>{weekendLive.liveTotal(entry.liveTotal)}</strong>
            <small>{weekendLive.confirmedMatches(entry.matchedFields.length)}</small>
            <div className="field-accuracy-list compact-list">
              {predictionFieldOrder.map((field) => (
                <div key={`${entry.userName}-${field}`} className="field-accuracy-row">
                  <span>{predictionLabels[field]}</span>
                  <strong>
                    {entry.matchedFields.includes(field) ? getDriverName(field) : '-'}
                  </strong>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default WeekendLivePanel;
