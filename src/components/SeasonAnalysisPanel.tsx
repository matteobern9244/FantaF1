import { BarChart3 } from 'lucide-react';
import type {
  PredictionKey,
  SeasonAnalyticsSummary,
} from '../types';
import { appText } from '../uiText';

interface SeasonAnalysisPanelProps {
  analyticsEmptyLabel: string;
  emptyOptionLabel: string;
  predictionLabels: Record<PredictionKey, string>;
  seasonAnalytics: SeasonAnalyticsSummary;
}

function SeasonAnalysisPanel({
  analyticsEmptyLabel,
  emptyOptionLabel,
  predictionLabels,
  seasonAnalytics,
}: SeasonAnalysisPanelProps) {
  const { seasonAnalysis } = appText.panels;

  return (
    <section className="panel nav-section" id="season-analysis">
      <div className="section-title">
        <BarChart3 size={20} />
        <h2>{seasonAnalysis.title}</h2>
      </div>
      <div className="analytics-summary-grid">
        {seasonAnalytics.narratives.map((entry) => (
          <article key={entry.slug} className="analytics-card interactive-surface">
            <span className="analytics-label">{entry.title}</span>
            <strong>{entry.userName}</strong>
            <small>{entry.description}</small>
          </article>
        ))}
      </div>
      <div className="season-comparison-table">
        {seasonAnalytics.comparison.map((entry) => (
          <div key={entry.userName} className="season-comparison-row interactive-surface">
            <strong>{entry.userName}</strong>
            <span>{entry.seasonPoints} pt</span>
            <span>{seasonAnalysis.leaderGap(entry.leaderGap)}</span>
            <span>{seasonAnalysis.hitRate(entry.totalHitRate)}</span>
            <span>{seasonAnalysis.consistency(entry.consistencyIndex)}</span>
          </div>
        ))}
      </div>
      <div className="analytics-columns">
        <div className="analytics-subpanel interactive-surface">
          <h3>{seasonAnalysis.cumulativeTrendTitle}</h3>
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
        <div className="analytics-subpanel interactive-surface">
          <h3>{seasonAnalysis.latestGpTitle}</h3>
          {seasonAnalytics.recap ? (
            <div className="weekend-pulse-summary">
              {seasonAnalytics.recap.trackOutlineUrl ? (
                <div className="track-map-container track-map-container-compact">
                  <img
                    alt={seasonAnalytics.recap.meetingName}
                    className="track-map track-map-compact"
                    src={seasonAnalytics.recap.trackOutlineUrl}
                  />
                </div>
              ) : null}
              <div className="spotlight-row">
                <span>{seasonAnalysis.latestGpLabel}</span>
                <strong>{seasonAnalytics.recap.gpName}</strong>
              </div>
              <div className="spotlight-row">
                <span>{seasonAnalysis.winnerLabel}</span>
                <strong>{seasonAnalytics.recap.winnerName}</strong>
              </div>
              <div className="spotlight-row">
                <span>{seasonAnalysis.swingLabel}</span>
                <strong>{seasonAnalytics.recap.swingLabel}</strong>
              </div>
              <div className="spotlight-row">
                <span>{seasonAnalysis.decisivePickLabel}</span>
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
