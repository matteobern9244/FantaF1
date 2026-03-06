import { describe, expect, it } from 'vitest';
import {
  buildHealthPayload,
  buildSaveErrorResponse,
  classifySaveError,
} from '../backend/http.js';

describe('backend http helpers', () => {
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
    expect(classifySaveError(new Error('I pronostici sono bloccati.'))).toBe('race_locked');
    expect(
      classifySaveError(new Error('MONGODB_URI targets "fantaf1" but development requires "fantaf1_dev".')),
    ).toBe('database_target_mismatch');
    expect(classifySaveError(new Error('MongoServerError: write failed'))).toBe(
      'storage_write_failed',
    );
  });
});
