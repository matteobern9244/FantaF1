import { BarChart3, Share2 } from 'lucide-react';
import type {
  PredictionKey,
  SeasonAnalyticsSummary,
} from '../types';

interface SeasonAnalysisPanelProps {
  analyticsEmptyLabel: string;
  emptyOptionLabel: string;
  onShare: () => void;
  predictionLabels: Record<PredictionKey, string>;
  seasonAnalytics: SeasonAnalyticsSummary;
}

function SeasonAnalysisPanel({
  analyticsEmptyLabel,
  emptyOptionLabel,
  onShare,
  predictionLabels,
  seasonAnalytics,
}: SeasonAnalysisPanelProps) {
  return (
    <section className="panel" id="season-analysis">
      <div className="panel-head">
        <div className="section-title">
          <BarChart3 size={20} />
          <h2>Analisi stagione</h2>
        </div>
        <button className="secondary-button compact-button" onClick={onShare} type="button">
          <Share2 size={16} />
          Copia link vista corrente
        </button>
      </div>
      <div className="analytics-summary-grid">
        {seasonAnalytics.narratives.map((entry) => (
          <article key={entry.slug} className="analytics-card">
            <span className="analytics-label">{entry.title}</span>
            <strong>{entry.userName}</strong>
            <small>{entry.description}</small>
          </article>
        ))}
      </div>
      <div className="season-comparison-table">
        {seasonAnalytics.comparison.map((entry) => (
          <div key={entry.userName} className="season-comparison-row">
            <strong>{entry.userName}</strong>
            <span>{entry.seasonPoints} pt</span>
            <span>Gap leader {entry.leaderGap}</span>
            <span>Hit rate {entry.totalHitRate}%</span>
            <span>Costanza {entry.consistencyIndex}</span>
          </div>
        ))}
      </div>
      <div className="analytics-columns">
        <div className="analytics-subpanel">
          <h3>Trend cumulato</h3>
          <div className="trend-chart" data-testid="season-cumulative-trend">
            {seasonAnalytics.comparison.map((entry) => {
              const maxValue = Math.max(
                ...seasonAnalytics.comparison.map((item) => item.seasonPoints),
                1,
              );

              return (
                <div key={`season-${entry.userName}`} className="trend-bar-group">
                  <div className="trend-bar-shell">
                    <span
                      className="trend-bar"
                      style={{ height: `${Math.max((entry.seasonPoints / maxValue) * 100, 8)}%` }}
                    />
                  </div>
                  <strong>{entry.seasonPoints}</strong>
                  <span>{entry.userName}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="analytics-subpanel">
          <h3>Recap ultimo GP</h3>
          {seasonAnalytics.recap ? (
            <div className="weekend-pulse-summary">
              <div className="spotlight-row">
                <span>GP</span>
                <strong>{seasonAnalytics.recap.gpName}</strong>
              </div>
              <div className="spotlight-row">
                <span>Vincitore weekend</span>
                <strong>{seasonAnalytics.recap.winnerName}</strong>
              </div>
              <div className="spotlight-row">
                <span>Swing classifica</span>
                <strong>{seasonAnalytics.recap.swingLabel}</strong>
              </div>
              <div className="spotlight-row">
                <span>Pick decisiva</span>
                <strong>
                  {seasonAnalytics.recap.decisiveField
                    ? predictionLabels[seasonAnalytics.recap.decisiveField]
                    : emptyOptionLabel}
                </strong>
              </div>
            </div>
          ) : (
            <p className="empty-copy">{analyticsEmptyLabel}</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default SeasonAnalysisPanel;
