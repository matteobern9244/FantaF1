import { describe, expect, it } from 'vitest';
import {
  buildHealthPayload,
  buildSaveErrorResponse,
  classifySaveError,
  createRequestId,
  extractErrorDetails,
} from '../backend/http.js';

describe('backend http helpers', () => {
  it('generates a unique request id', () => {
    const id1 = createRequestId();
    const id2 = createRequestId();
    expect(id1).toBeDefined();
    expect(typeof id1).toBe('string');
    expect(id1).not.toBe(id2);
  });

  it('builds the health payload with environment metadata', () => {
    expect(
      buildHealthPayload({
        currentYear: 2026,
        dbState: 1,
        environment: 'development',
        databaseTarget: 'fantaf1_dev',
      }),
    ).toEqual({
      status: 'ok',
      year: 2026,
      dbState: 1,
      environment: 'development',
      databaseTarget: 'fantaf1_dev',
    });
  });

  it('includes details outside production for save errors', () => {
    expect(
      buildSaveErrorResponse({
        environment: 'development',
        requestId: 'req-dev',
        code: 'storage_write_failed',
        error: 'Impossibile salvare i dati.',
        details: 'mongo write failed',
      }),
    ).toEqual({
      status: 500,
      payload: {
        error: 'Impossibile salvare i dati.',
        code: 'storage_write_failed',
        requestId: 'req-dev',
        details: 'mongo write failed',
      },
    });
  });

  it('hides details in production save errors', () => {
    expect(
      buildSaveErrorResponse({
        environment: 'production',
        requestId: 'req-prod',
        code: 'save_unexpected_error',
        error: 'Impossibile salvare i dati.',
        details: 'hidden stack',
      }),
    ).toEqual({
      status: 500,
      payload: {
        error: 'Impossibile salvare i dati.',
        code: 'save_unexpected_error',
        requestId: 'req-prod',
      },
    });
  });

  it('maps validation and database/storage failures to stable save codes', () => {
    expect(
      classifySaveError(new Error('Invalid participants list. Expected 3 participants.')),
    ).toBe('participants_invalid');
    expect(
      classifySaveError(new Error("Il salvataggio richiede l'inserimento di almeno un pronostico.")),
    ).toBe('predictions_missing');
    expect(classifySaveError(new Error('I pronostici sono bloccati.'))).toBe('race_locked');
    expect(
      classifySaveError(new Error('MONGODB_URI targets "fantaf1" but development requires "fantaf1_dev".')),
    ).toBe('database_target_mismatch');
    expect(classifySaveError(new Error('MongoServerError: write failed'))).toBe(
      'storage_write_failed',
    );
  });

  it('classifies unknown errors as save_unexpected_error', () => {
    expect(classifySaveError(new Error('Something completely unexpected'))).toBe(
      'save_unexpected_error',
    );
  });

  it('extracts details from different error types', () => {
    expect(extractErrorDetails('String error')).toBe('String error');
    expect(extractErrorDetails({ key: 'value' })).toBe('{"key":"value"}');

    const circularObj = {};
    circularObj.self = circularObj;
    expect(extractErrorDetails(circularObj)).toBe('[object Object]');
  });

  it('builds save error payload without details if details are missing', () => {
    const response = buildSaveErrorResponse({
      environment: 'development',
      requestId: 'req-1',
      code: 'save_unexpected_error',
      error: 'Impossibile salvare.',
    });
    expect(response.payload.details).toBeUndefined();
    expect(response.status).toBe(500);
  });

  it('falls back to error.message when an Error instance has an empty stack and uses status 500 for unknown codes', () => {
    const error = new Error('Only message remains');
    error.stack = '';

    expect(extractErrorDetails(error)).toBe('Only message remains');
    expect(
      buildSaveErrorResponse({
        environment: 'development',
        requestId: 'req-unknown',
        code: 'not_mapped',
        error: 'Generic save failure',
      }),
    ).toEqual({
      status: 500,
      payload: {
        error: 'Generic save failure',
        code: 'not_mapped',
        requestId: 'req-unknown',
      },
    });
  });
});
