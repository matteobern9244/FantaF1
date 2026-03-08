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
        <div className="spotlight-row">
          <span>{publicGuide.pointsLabel}</span>
          <strong>{publicGuide.pointsSummary}</strong>
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
