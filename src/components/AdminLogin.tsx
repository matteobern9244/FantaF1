import React, { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { appConfig } from '../constants';
import type { SessionState } from '../types';

const { uiText } = appConfig;
const adminSessionApiUrl = '/api/admin/session';

interface AdminLoginProps {
  onCancel: () => void;
  onSuccess: (session: SessionState) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onCancel, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!password.trim()) {
      setError(uiText.alerts.adminPasswordRequired);
      return;
    }

    try {
      const response = await fetch(adminSessionApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        let loginErrorMessage = uiText.backend.errors.saveFailed;
        try {
          const payload = (await response.json()) as { code?: string; error?: string };
          if (payload.code === 'admin_auth_invalid') {
            loginErrorMessage = uiText.backend.auth.invalidPassword;
          } else if (typeof payload.error === 'string' && payload.error.trim()) {
            loginErrorMessage = payload.error.trim();
          }
        } catch {
          loginErrorMessage = uiText.backend.errors.saveFailed;
        }
        setError(loginErrorMessage);
        return;
      }

      const session = (await response.json()) as SessionState;
      onSuccess(session);
    } catch (err) {
      console.error(err);
      setError(uiText.backend.errors.saveFailed);
    }
  }

  return (
    <div className="auth-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="section-title">
          <LockKeyhole size={20} />
          <h2 id="admin-login-title">{uiText.headings.adminAccess}</h2>
        </div>
        <div className="field-row">
          <label htmlFor="admin-password">{uiText.buttons.adminView}</label>
          <input
            id="admin-password"
            className="auth-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
        </div>
        {error ? <p className="locked-banner">{error}</p> : null}
        <div className="results-actions">
          <button className="secondary-button" onClick={onCancel} type="button">
            {uiText.buttons.publicView}
          </button>
          <button className="primary-button" onClick={handleLogin} type="button">
            <LockKeyhole size={16} />
            {uiText.buttons.adminView}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
