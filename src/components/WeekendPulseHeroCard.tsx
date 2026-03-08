import { Gauge } from 'lucide-react';
import type { OfficialResultsAvailability } from '../utils/appHelpers';

interface WeekendPulseHeroCardProps {
  officialResultsAvailability: OfficialResultsAvailability | null;
  weekendCountdownLabel: string;
  weekendStatusLabel: string;
}

function WeekendPulseHeroCard({
  officialResultsAvailability,
  weekendCountdownLabel,
  weekendStatusLabel,
}: WeekendPulseHeroCardProps) {
  return (
    <section className="hero-card">
      <div className="card-heading">
        <Gauge size={18} />
        <span>Weekend pulse</span>
      </div>
      <div className="weekend-pulse-summary">
        <div className="spotlight-row">
          <span>Stato weekend</span>
          <strong>{weekendStatusLabel}</strong>
        </div>
        <div className="spotlight-row">
          <span>Countdown lock</span>
          <strong>{weekendCountdownLabel}</strong>
        </div>
        <div className="spotlight-row">
          <span>Risultati ufficiali</span>
          <strong>
            {officialResultsAvailability === 'complete'
              ? 'Completi'
              : officialResultsAvailability === 'partial'
                ? 'Parziali'
                : 'In attesa'}
          </strong>
        </div>
      </div>
    </section>
  );
}

export default WeekendPulseHeroCard;
