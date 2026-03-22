import React from 'react';
import { BarChart3 } from 'lucide-react';
import { UserData, PredictionKey, SeasonAnalyticsSummary, UserAnalyticsSummary, UserKpiSummary, UserFieldAccuracy, UserGpTrendPoint } from '../types';
import SeasonAnalysisPanel from '../components/SeasonAnalysisPanel';
import { appConfig } from '../constants';

const { uiText } = appConfig;

interface AnalysisPageProps {
  seasonAnalytics: SeasonAnalyticsSummary;
  predictionLabels: Record<PredictionKey, string>;
  selectedAnalyticsSummary: UserAnalyticsSummary | null;
  formatTrendDriver: (id: string) => string;
  selectedInsightsUserName: string;
  formatAverageValue: (value: number | null, digits?: number) => string;
  selectedKpiSummary: UserKpiSummary | null;
  users: UserData[];
  onSelectedInsightsUserChange: (userName: string) => void;
  activeSectionId: string;
}

const AnalysisPage: React.FC<AnalysisPageProps> = ({
  seasonAnalytics,
  predictionLabels,
  selectedAnalyticsSummary,
  formatTrendDriver,
  selectedInsightsUserName,
  formatAverageValue,
  selectedKpiSummary,
  users,
  onSelectedInsightsUserChange,
  activeSectionId,
}) => {
  const visibleSectionId = activeSectionId === 'user-analytics-section'
    ? 'user-analytics-section'
    : activeSectionId === 'user-kpi-section'
      ? 'user-kpi-section'
      : 'season-analysis';

  return (
    <>
      {visibleSectionId === 'season-analysis' ? (
        <SeasonAnalysisPanel
          analyticsEmptyLabel={uiText.history.analyticsEmpty}
          emptyOptionLabel={uiText.placeholders.emptyOption}
          predictionLabels={predictionLabels}
          seasonAnalytics={seasonAnalytics}
        />
      ) : null}

      {visibleSectionId === 'user-analytics-section' ? (
        <section className="panel analytics-panel nav-section" id="user-analytics-section">
        <div className="section-title">
          <BarChart3 size={20} />
          <h2>{uiText.headings.userAnalytics}</h2>
        </div>
        {selectedAnalyticsSummary ? (
          <>
            <div className="analytics-summary-grid">
              <article className="analytics-card interactive-surface">
                <span className="analytics-label">{uiText.labels.bestWeekend}</span>
                <strong>{selectedAnalyticsSummary.bestWeekend?.gpName ?? uiText.history.unknownDriver}</strong>
                <small>
                  {selectedAnalyticsSummary.bestWeekend?.points ?? 0} {uiText.pointsSuffix}
                </small>
              </article>
              <article className="analytics-card interactive-surface">
                <span className="analytics-label">{uiText.labels.worstWeekend}</span>
                <strong>{selectedAnalyticsSummary.worstWeekend?.gpName ?? uiText.history.unknownDriver}</strong>
                <small>
                  {selectedAnalyticsSummary.worstWeekend?.points ?? 0} {uiText.pointsSuffix}
                </small>
              </article>
              <article className="analytics-card interactive-surface">
                <span className="analytics-label">{uiText.labels.mostPickedDriver}</span>
                <strong>{formatTrendDriver(selectedAnalyticsSummary.mostPickedDriverId)}</strong>
                <small>{selectedInsightsUserName}</small>
              </article>
            </div>

            <div className="analytics-columns">
              <div className="analytics-subpanel interactive-surface">
                <h3>{uiText.labels.fieldAccuracy}</h3>
                <div className="field-accuracy-list">
                  {selectedAnalyticsSummary.fieldAccuracy.map((entry: UserFieldAccuracy) => (
                    <div key={`${selectedAnalyticsSummary.userName}-${entry.field}`} className="field-accuracy-row">
                      <span>{predictionLabels[entry.field]}</span>
                      <strong>{entry.accuracy}%</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="analytics-subpanel interactive-surface">
                <h3>{uiText.labels.pointsTrend}</h3>
                {selectedAnalyticsSummary.trend.length > 0 ? (
                  <div className="trend-chart" data-testid="user-points-trend">
                    {selectedAnalyticsSummary.trend.map((point: UserGpTrendPoint) => {
                      const maxTrendValue = Math.max(
                        ...selectedAnalyticsSummary.trend.map((trendPoint: UserGpTrendPoint) => trendPoint.points),
                        1,
                      );
                      return (
                        <div key={`${selectedAnalyticsSummary.userName}-${point.gpName}`} className="trend-bar-group">
                          <div className="trend-bar-shell">
                            <span
                              className="trend-bar"
                              style={{ height: `${Math.max((point.points / maxTrendValue) * 100, 8)}%` }}
                            />
                          </div>
                          <strong>{point.points}</strong>
                          <span>{point.gpName}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty-copy">{uiText.history.analyticsEmpty}</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="empty-copy">{uiText.history.analyticsEmpty}</p>
        )}
        </section>
      ) : null}

      {visibleSectionId === 'user-kpi-section' ? (
        <section className="panel nav-section" id="user-kpi-section">
        <div className="panel-head">
          <div className="section-title">
            <BarChart3 size={20} />
            <h2>{uiText.headings.userKpi}</h2>
          </div>
          <div className="insights-picker">
            <label htmlFor="insights-user-selector">{uiText.labels.userKpiSelector}</label>
            <select
              id="insights-user-selector"
              value={selectedInsightsUserName}
              onChange={(event) => onSelectedInsightsUserChange(event.target.value)}
            >
              {users.map((user) => (
                <option key={`insights-${user.name}`} value={user.name}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {selectedKpiSummary ? (
          <div className="kpi-grid" data-testid="user-kpi-dashboard">
            <article className="kpi-card interactive-surface">
              <strong>{selectedKpiSummary.seasonPoints}</strong>
              <span>{uiText.labels.seasonPoints}</span>
            </article>
            <article className="kpi-card interactive-surface">
              <strong>{formatAverageValue(selectedKpiSummary.averagePosition, 1)}</strong>
              <span>{uiText.labels.averagePosition}</span>
            </article>
            <article className="kpi-card interactive-surface">
              <strong>{selectedKpiSummary.poleAccuracy}%</strong>
              <span>{uiText.labels.poleAccuracy}</span>
            </article>
            <article className="kpi-card interactive-surface">
              <strong>{formatAverageValue(selectedKpiSummary.averagePointsPerRace, 2)}</strong>
              <span>{uiText.labels.averagePointsPerRace}</span>
            </article>
          </div>
        ) : (
          <p className="empty-copy">{uiText.history.analyticsEmpty}</p>
        )}
        </section>
      ) : null}
    </>
  );
};

export default AnalysisPage;
