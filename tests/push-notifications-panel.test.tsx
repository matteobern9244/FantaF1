/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PushNotificationsPanel from '../src/components/PushNotificationsPanel';

describe('PushNotificationsPanel', () => {
  it('renders the enable action for the idle state', () => {
    const onEnable = vi.fn();
    render(
      <PushNotificationsPanel
        status="idle"
        isBusy={false}
        onEnable={onEnable}
        onDisable={() => {}}
        onSendTest={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Attiva notifiche' }));
    expect(onEnable).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/attiva le notifiche per ricevere gli aggiornamenti/i)).toBeInTheDocument();
  });

  it('enables disable and test actions when notifications are active', () => {
    const onDisable = vi.fn();
    const onSendTest = vi.fn();
    render(
      <PushNotificationsPanel
        status="enabled"
        isBusy={false}
        onEnable={() => {}}
        onDisable={onDisable}
        onSendTest={onSendTest}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /disattiva notifiche/i }));
    fireEvent.click(screen.getByRole('button', { name: /invia test push/i }));

    expect(onDisable).toHaveBeenCalledTimes(1);
    expect(onSendTest).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/notifiche push attive su questo dispositivo/i)).toBeInTheDocument();
  });

  it('renders the unsupported state when the push stack is unavailable', () => {
    render(
      <PushNotificationsPanel
        status="unsupported"
        isBusy={false}
        onEnable={() => {}}
        onDisable={() => {}}
        onSendTest={() => {}}
      />,
    );

    expect(screen.getByText(/questo browser non supporta le notifiche push/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attiva notifiche' })).toBeDisabled();
  });
});
