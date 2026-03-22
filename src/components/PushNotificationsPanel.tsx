import { Bell, BellOff, Radio } from 'lucide-react';
import { appText } from '../uiText';

type PushPanelStatus = 'unsupported' | 'idle' | 'enabled' | 'permission-denied' | 'loading';

interface PushNotificationsPanelProps {
  status: PushPanelStatus;
  isBusy: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onSendTest: () => void;
}

function PushNotificationsPanel({
  status,
  isBusy,
  onEnable,
  onDisable,
  onSendTest,
}: PushNotificationsPanelProps) {
  const panelText = appText.panels.pushNotifications;

  const copy = {
    unsupported: panelText.unsupported,
    idle: panelText.idle,
    enabled: panelText.enabled,
    'permission-denied': panelText.permissionDenied,
    loading: panelText.idle,
  }[status];

  return (
    <section className="panel nav-section" id="push-notifications">
      <div className="section-title">
        <Radio size={20} />
        <h2>{panelText.title}</h2>
      </div>

      <p className="sidebar-note">{copy}</p>

      <div className="results-actions">
        <button
          className="primary-button"
          disabled={isBusy || status === 'unsupported' || status === 'enabled'}
          onClick={onEnable}
          type="button"
        >
          <Bell size={16} />
          <span>{panelText.enableButton}</span>
        </button>

        <button
          className="secondary-button"
          disabled={isBusy || status !== 'enabled'}
          onClick={onDisable}
          type="button"
        >
          <BellOff size={16} />
          <span>{panelText.disableButton}</span>
        </button>

        <button
          className="secondary-button"
          disabled={isBusy || status !== 'enabled'}
          onClick={onSendTest}
          type="button"
        >
          <Radio size={16} />
          <span>{panelText.testButton}</span>
        </button>
      </div>
    </section>
  );
}

export default PushNotificationsPanel;
export type { PushPanelStatus };
