import { Gauge } from 'lucide-react';
import type { OfficialResultsAvailability } from '../utils/appHelpers';
import { appText } from '../uiText';

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
  const { weekendPulseHero } = appText.panels;

  return (
    <section className="hero-card interactive-surface">
      <div className="card-heading">
        <Gauge size={18} />
        <span>{weekendPulseHero.title}</span>
      </div>
      <div className="weekend-pulse-summary">
        <div className="spotlight-row">
          <span>{weekendPulseHero.statusLabel}</span>
          <strong>{weekendStatusLabel}</strong>
        </div>
        <div className="spotlight-row">
          <span>{weekendPulseHero.countdownLabel}</span>
          <strong>{weekendCountdownLabel}</strong>
        </div>
        <div className="spotlight-row">
          <span>{weekendPulseHero.availabilityLabel}</span>
          <strong>
            {officialResultsAvailability === 'complete'
              ? weekendPulseHero.availability.complete
              : officialResultsAvailability === 'partial'
                ? weekendPulseHero.availability.partial
                : weekendPulseHero.availability.pending}
          </strong>
        </div>
      </div>
    </section>
  );
}

export default WeekendPulseHeroCard;
