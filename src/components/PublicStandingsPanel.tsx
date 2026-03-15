import type { CSSProperties } from 'react';
import { Flag, ShieldCheck } from 'lucide-react';
import type { ConstructorStanding, DriverStanding } from '../types';
import { appText } from '../uiText';
import { getDriverPortraitUrl } from '../utils/driverAvatar';

interface PublicStandingsPanelProps {
  constructorStandings: ConstructorStanding[];
  driverStandings: DriverStanding[];
  updatedAt: string;
}

function buildPodiumClass(position: number) {
  if (position === 1) return 'first';
  if (position === 2) return 'second';
  if (position === 3) return 'third';
  return '';
}

function PublicStandingsPanel({
  constructorStandings,
  driverStandings,
  updatedAt,
}: PublicStandingsPanelProps) {
  const { publicStandings } = appText.panels;
  const formattedUpdatedAt = updatedAt
    ? new Date(updatedAt).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const hasStandings = driverStandings.length > 0 || constructorStandings.length > 0;

  return (
    <section className="panel public-standings-panel nav-section" id="public-standings">
      <div className="panel-head">
        <div className="section-title">
          <Flag size={20} />
          <h2>{publicStandings.title}</h2>
        </div>
        {formattedUpdatedAt ? (
          <p className="sidebar-note">
            {publicStandings.updatedAtLabel}: <strong>{formattedUpdatedAt}</strong>
          </p>
        ) : null}
      </div>

      {!hasStandings ? (
        <p className="empty-copy">{publicStandings.emptyLabel}</p>
      ) : (
        <div className="public-standings-grid public-standings-grid-compact">
          <article className="analytics-subpanel interactive-surface standings-subpanel standings-subpanel-compact">
            <div className="section-title standings-subpanel-title">
              <Flag size={16} />
              <h3>{publicStandings.driversTitle}</h3>
            </div>
            <div className="standings-list">
              {driverStandings.map((entry) => (
                <article
                  key={`${entry.position}-${entry.name}`}
                  className={`standings-row interactive-surface ${buildPodiumClass(entry.position)}`.trim()}
                >
                  <span className="standings-position">{publicStandings.driverPositionLabel(entry)}</span>
                  <div className="standings-driver-media">
                    {entry.avatarUrl ? (
                      <img
                        alt={entry.name}
                        className="standings-avatar"
                        src={getDriverPortraitUrl(entry.avatarUrl)}
                      />
                    ) : (
                      <span className="standings-avatar standings-avatar-fallback" aria-hidden="true">
                        {entry.name.slice(0, 1)}
                      </span>
                    )}
                    <div className="standings-driver-copy">
                      <strong>{entry.name}</strong>
                      <span>{entry.team}</span>
                    </div>
                  </div>
                  <strong className="standings-points">{publicStandings.pointsLabel(entry.points)}</strong>
                </article>
              ))}
            </div>
          </article>

          <article className="analytics-subpanel interactive-surface standings-subpanel standings-subpanel-compact">
            <div className="section-title standings-subpanel-title">
              <ShieldCheck size={16} />
              <h3>{publicStandings.constructorsTitle}</h3>
            </div>
            <div className="standings-list">
              {constructorStandings.map((entry) => (
                <article
                  key={`${entry.position}-${entry.team}`}
                  className={`standings-row standings-row-constructor interactive-surface ${buildPodiumClass(entry.position)}`.trim()}
                >
                  <span className="standings-position">{publicStandings.constructorPositionLabel(entry)}</span>
                  <div className="standings-constructor-copy">
                    {entry.logoUrl ? (
                      <img
                        alt={`${entry.team} logo`}
                        className="standings-team-logo"
                        src={entry.logoUrl}
                      />
                    ) : null}
                    <strong
                      className="standings-constructor-name"
                      style={{ '--team-color': entry.color ?? '' } as CSSProperties}
                    >
                      {entry.team}
                    </strong>
                  </div>
                  <strong className="standings-points">{publicStandings.pointsLabel(entry.points)}</strong>
                </article>
              ))}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

export default PublicStandingsPanel;
