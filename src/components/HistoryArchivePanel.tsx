import { ChevronDown, Trophy } from 'lucide-react';
import type { AppData, PredictionKey, UserData } from '../types';
import { appText } from '../uiText';

interface HistoryArchivePanelProps {
  editingSession: {
    historyIndex: number;
    record: AppData['history'][number];
  } | null;
  expandedHistoryKey: string;
  filteredHistoryEntries: Array<{
    index: number;
    record: AppData['history'][number];
  }>;
  getHistoryFieldHitLabel: (
    record: AppData['history'][number],
    userName: string,
    field: PredictionKey,
  ) => string;
  getHistoryKey: (record: AppData['history'][number], index: number) => string;
  historyEmptyLabel: string;
  historySearch: string;
  historyUserFilter: string;
  isPublicView: boolean;
  onDeleteHistoryRace: (historyIndex: number) => void;
  onEditHistoryRace: (historyIndex: number) => void;
  onHistorySearchChange: (value: string) => void;
  onHistoryUserFilterChange: (value: string) => void;
  onToggleExpanded: (historyKey: string) => void;
  pointsSuffix: string;
  predictionFieldOrder: PredictionKey[];
  predictionLabels: Record<PredictionKey, string>;
  renderHistoryResults: (record: AppData['history'][number]) => string;
  unknownDriverLabel: string;
  userDisplayNameForWinner: (record: AppData['history'][number], userName: string) => string;
  users: UserData[];
}

function HistoryArchivePanel({
  editingSession,
  expandedHistoryKey,
  filteredHistoryEntries,
  getHistoryFieldHitLabel,
  getHistoryKey,
  historyEmptyLabel,
  historySearch,
  historyUserFilter,
  isPublicView,
  onDeleteHistoryRace,
  onEditHistoryRace,
  onHistorySearchChange,
  onHistoryUserFilterChange,
  onToggleExpanded,
  pointsSuffix,
  predictionFieldOrder,
  predictionLabels,
  renderHistoryResults,
  unknownDriverLabel,
  userDisplayNameForWinner,
  users,
}: HistoryArchivePanelProps) {
  const { historyArchive } = appText.panels;

  return (
    <section className="panel">
      <div className="section-title">
        <Trophy size={20} />
        <h2>{historyArchive.title}</h2>
      </div>
      <div className="history-filters">
        <div className="field-row">
          <label htmlFor="history-user-filter">{historyArchive.userFilterLabel}</label>
          <select
            id="history-user-filter"
            value={historyUserFilter}
            onChange={(event) => onHistoryUserFilterChange(event.target.value)}
          >
            <option value="all">{historyArchive.allUsersOption}</option>
            {users.map((user) => (
              <option key={`history-filter-${user.name}`} value={user.name}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <label htmlFor="history-search">{historyArchive.searchLabel}</label>
          <input
            id="history-search"
            className="auth-input"
            type="text"
            value={historySearch}
            onChange={(event) => onHistorySearchChange(event.target.value)}
          />
        </div>
      </div>
      <p className="sidebar-note">{historyArchive.shownCount(filteredHistoryEntries.length)}</p>
      {filteredHistoryEntries.length === 0 ? (
        <p className="empty-copy">{historyEmptyLabel}</p>
      ) : (
        <div className="history-stack" id="history-archive">
          {filteredHistoryEntries.map(({ record, index }) => {
            const historyKey = getHistoryKey(record, index);
            const isExpanded = expandedHistoryKey === historyKey;

            return (
              <article key={`${record.gpName}-${record.date}-${index}`} className="history-card interactive-surface">
                <div className="history-top">
                  <div className="history-top-row">
                    <div>
                      <strong>{record.gpName}</strong>
                      <span>{record.date}</span>
                    </div>
                    {!isPublicView ? (
                      <div className="history-actions">
                        <button
                          className="secondary-button compact-button"
                          onClick={() => onEditHistoryRace(index)}
                          type="button"
                          disabled={Boolean(editingSession)}
                        >
                          {historyArchive.editButton}
                        </button>
                        <button
                          className="secondary-button compact-button danger-button"
                          onClick={() => onDeleteHistoryRace(index)}
                          type="button"
                          disabled={Boolean(editingSession)}
                        >
                          {historyArchive.deleteButton}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <span className="history-summary">{renderHistoryResults(record)}</span>
                </div>
                <div className="history-top-row">
                  <button
                    className="secondary-button compact-button"
                    onClick={() => onToggleExpanded(isExpanded ? '' : historyKey)}
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`history-detail-${index}`}
                  >
                    <ChevronDown size={16} />
                    {historyArchive.detailButton(record.gpName)}
                  </button>
                </div>

                <div className="history-grid history-grid-compact">
                  {Object.entries(record.userPredictions).map(([name, result]) => (
                    <div key={name} className="history-user-card interactive-surface">
                      <strong>{name}</strong>
                      <span>
                        {result.pointsEarned} {pointsSuffix}
                      </span>
                      <small>{userDisplayNameForWinner(record, name) || unknownDriverLabel}</small>
                    </div>
                  ))}
                </div>
                {isExpanded ? (
                  <div className="history-detail-panel" id={`history-detail-${index}`}>
                    <h3>{historyArchive.detailTitle}</h3>
                    {Object.entries(record.userPredictions).map(([name]) => (
                      <div key={`detail-${record.gpName}-${name}`} className="analytics-subpanel interactive-surface">
                        <strong>{name}</strong>
                        <div className="field-accuracy-list compact-list">
                          {predictionFieldOrder.map((field) => (
                            <div key={`${record.gpName}-${name}-${field}`} className="field-accuracy-row">
                              <span>{predictionLabels[field]}</span>
                              <strong>{getHistoryFieldHitLabel(record, name, field)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default HistoryArchivePanel;
