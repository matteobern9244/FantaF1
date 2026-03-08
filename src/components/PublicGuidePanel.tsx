import { ShieldCheck } from 'lucide-react';
import type { PointsConfig } from '../types';

interface PublicGuidePanelProps {
  points: PointsConfig;
  pointsSuffix: string;
}

function PublicGuidePanel({ points, pointsSuffix }: PublicGuidePanelProps) {
  return (
    <section className="panel" id="public-guide">
      <div className="section-title">
        <ShieldCheck size={20} />
        <h2>Come funziona</h2>
      </div>
      <div className="weekend-pulse-summary">
        <div className="spotlight-row">
          <span>Punti gara</span>
          <strong>
            1° {points.first} {pointsSuffix}, 2° {points.second} {pointsSuffix}, 3° {points.third}{' '}
            {pointsSuffix}, Pole/Sprint {points.pole} {pointsSuffix}
          </strong>
        </div>
        <div className="spotlight-row">
          <span>Race lock</span>
          <strong>I pronostici si chiudono all'orario ufficiale di partenza.</strong>
        </div>
        <div className="spotlight-row">
          <span>Vista live</span>
          <strong>Classifica storica piu' proiezione del weekend selezionato.</strong>
        </div>
        <div className="spotlight-row">
          <span>Weekend Sprint</span>
          <strong>
            Il quarto campo usa Pole o vincitore Sprint in base al formato del weekend.
          </strong>
        </div>
      </div>
    </section>
  );
}

export default PublicGuidePanel;
