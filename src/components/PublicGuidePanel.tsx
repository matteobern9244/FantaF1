import { ShieldCheck } from 'lucide-react';
import { appText } from '../uiText';

function PublicGuidePanel() {
  const { publicGuide } = appText.panels;

  return (
    <section className="panel" id="public-guide">
      <div className="section-title">
        <ShieldCheck size={20} />
        <h2>{publicGuide.title}</h2>
      </div>
      <div className="weekend-pulse-summary">
        <div className="public-guide-race-strip" aria-label={publicGuide.pointsLabel}>
          {publicGuide.pointsStrip.map((entry) => (
            <article key={entry.field} className="race-strip-segment interactive-surface">
              <span>{entry.label}</span>
              <strong>
                +{entry.points} {publicGuide.pointsSuffix}
              </strong>
            </article>
          ))}
        </div>
        <div className="spotlight-row">
          <span>{publicGuide.raceLockLabel}</span>
          <strong>{publicGuide.raceLockValue}</strong>
        </div>
        <div className="spotlight-row">
          <span>{publicGuide.liveViewLabel}</span>
          <strong>{publicGuide.liveViewValue}</strong>
        </div>
        <div className="spotlight-row">
          <span>{publicGuide.sprintLabel}</span>
          <strong>{publicGuide.sprintValue}</strong>
        </div>
      </div>
    </section>
  );
}

export default PublicGuidePanel;
