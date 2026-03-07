/**
 * @vitest-environment jsdom
 */
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

  it('keeps the production alert fully generic when the backend does not return a request id', async () => {
    const response = new Response(
      JSON.stringify({
        error: 'I pronostici sono bloccati.',
        code: 'race_locked',
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

    expect(error.userMessage).toBe('Impossibile salvare i dati.');
    expect(error.requestId).toBeUndefined();
  });

  it('returns the userMessage directly if the error is a SaveRequestError', () => {
    const saveError = new SaveRequestError('Backend error', {
      status: 500,
      userMessage: 'Messaggio utente formattato',
    });
    expect(
      getSaveErrorAlertMessage({
        error: saveError,
        fallbackMessage: 'Fallback message',
        environment: 'development',
      })
    ).toBe('Messaggio utente formattato');
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

  it('formats nullish non-Error values as empty details in development', () => {
    expect(
      getSaveErrorAlertMessage({
        error: null,
        fallbackMessage: 'Impossibile salvare i dati.',
        environment: 'development',
      }),
    ).toBe('Impossibile salvare i dati.');
  });

  it('handles non-JSON responses gracefully by falling back to the default message', async () => {
    const response = new Response('<html>502 Bad Gateway</html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    });

    const error = await createSaveRequestError(response, {
      fallbackMessage: 'Errore generico di salvataggio.',
      environment: 'development',
    });

    expect(error.userMessage).toBe('Errore generico di salvataggio.');
    expect(error.details).toBeUndefined();
  });

  it('summarizes multi-line details and ignores leading empty lines', () => {
    expect(
      getSaveErrorAlertMessage({
        error: 'Error',
        fallbackMessage: 'Fallback',
        environment: 'development',
      }),
    ).toBe('Fallback\nDettagli: Error'); // L'oggetto error non e' un'istanza di Error ma una stringa

    expect(
      getSaveErrorAlertMessage({
        error: new Error('\n\nPrima riga valida\nSeconda riga ignorata'),
        fallbackMessage: 'Fallback',
        environment: 'development',
      }),
    ).toBe('Fallback\nDettagli: Prima riga valida');
  });

  it('truncates extremely long details over 240 characters', async () => {
    const longString = 'A'.repeat(300);
    const response = new Response(
      JSON.stringify({ error: 'Save failed', details: longString }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const error = await createSaveRequestError(response, {
      fallbackMessage: 'Fallback',
      environment: 'development',
    });

    expect(error.userMessage).toContain('A'.repeat(237) + '...');
  });
});
