import { describe, expect, it } from 'vitest';
import {
  SaveRequestError,
  createSaveRequestError,
  getSaveErrorAlertMessage,
} from '../src/utils/save';

describe('UI save error helpers', () => {
  it('builds a detailed development message from backend save payloads', async () => {
    const response = new Response(
      JSON.stringify({
        error: 'I pronostici sono bloccati.',
        code: 'race_locked',
        requestId: 'req-dev',
        details: 'Race 2026-01 started at 2026-03-06T02:30:00Z.',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const error = await createSaveRequestError(response, {
      fallbackMessage: 'Impossibile salvare i dati.',
      environment: 'development',
    });

    expect(error).toBeInstanceOf(SaveRequestError);
    expect(error.status).toBe(403);
    expect(error.code).toBe('race_locked');
    expect(error.requestId).toBe('req-dev');
    expect(error.message).toBe('I pronostici sono bloccati.');
    expect(error.userMessage).toContain('I pronostici sono bloccati.');
    expect(error.userMessage).toContain('Codice: race_locked');
    expect(error.userMessage).toContain('Dettagli: Race 2026-01 started at 2026-03-06T02:30:00Z.');
    expect(error.userMessage).toContain('Request ID: req-dev');
  });

  it('keeps the production alert generic while preserving the request id', async () => {
    const response = new Response(
      JSON.stringify({
        error: 'I pronostici sono bloccati.',
        code: 'race_locked',
        requestId: 'req-prod',
        details: 'hidden details',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const error = await createSaveRequestError(response, {
      fallbackMessage: 'Impossibile salvare i dati.',
      environment: 'production',
    });

    expect(error.message).toBe('I pronostici sono bloccati.');
    expect(error.userMessage).toBe('Impossibile salvare i dati. (ref: req-prod)');
    expect(error.details).toBe('hidden details');
  });

  it('falls back to the thrown error details in development when the request did not return JSON', () => {
    expect(
      getSaveErrorAlertMessage({
        error: new Error('Failed to fetch'),
        fallbackMessage: 'Impossibile salvare i dati.',
        environment: 'development',
      }),
    ).toBe('Impossibile salvare i dati.\nDettagli: Failed to fetch');
  });

  it('keeps a generic fallback in production for non structured errors', () => {
    expect(
      getSaveErrorAlertMessage({
        error: new Error('Failed to fetch'),
        fallbackMessage: 'Impossibile salvare i dati.',
        environment: 'production',
      }),
    ).toBe('Impossibile salvare i dati.');
  });
});
