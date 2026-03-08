import { describe, expect, it, vi } from 'vitest';
import { SaveRequestService } from '../backend/app-route-service.js';

function createResponseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

describe('SaveRequestService', () => {
  it('rejects invalid participants before attempting persistence', async () => {
    const service = new SaveRequestService({
      requireAdminSession: vi.fn().mockReturnValue(true),
      verifyMongoDatabaseName: vi.fn(),
      readPersistedParticipantRoster: vi.fn().mockResolvedValue(['A', 'B', 'C']),
      validateParticipants: vi.fn().mockReturnValue(false),
      buildParticipantsInvalidResponse: vi.fn().mockReturnValue({ status: 400, payload: { code: 'participants_invalid' } }),
      readCalendarCache: vi.fn(),
      readAppData: vi.fn(),
      isRaceLocked: vi.fn(),
      buildSaveErrorResponse: vi.fn(),
      formatBackendText: vi.fn(),
      backendText: { save: {} },
      appConfig: { uiText: { backend: { messages: { saveSuccess: 'ok' }, errors: { saveFailed: 'failed' } }, calendar: { raceLockedError: 'locked' } } },
      validatePredictions: vi.fn(),
      buildPredictionsMissingResponse: vi.fn(),
      writeAppData: vi.fn(),
      classifySaveError: vi.fn(),
      extractErrorDetails: vi.fn(),
      runtimeEnvironment: 'development',
      databaseTargetName: 'fantaf1_dev',
      participantSlots: 3,
      predictionFieldOrder: ['first', 'second', 'third', 'pole'],
      createRequestId: vi.fn().mockReturnValue('req-1'),
    });
    const res = createResponseRecorder();

    await service.handleSaveRequest({ body: { users: [] } }, res, {
      requirePredictions: false,
      routePath: '/api/data',
    });

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ code: 'participants_invalid' });
  });

  it('saves valid payloads and surfaces prediction validation failures', async () => {
    const writeAppData = vi.fn().mockResolvedValue({});
    const service = new SaveRequestService({
      requireAdminSession: vi.fn().mockReturnValue(true),
      verifyMongoDatabaseName: vi.fn(),
      readPersistedParticipantRoster: vi.fn().mockResolvedValue(['A', 'B', 'C']),
      validateParticipants: vi.fn().mockReturnValue(true),
      buildParticipantsInvalidResponse: vi.fn(),
      readCalendarCache: vi.fn().mockResolvedValue([]),
      readAppData: vi.fn(),
      isRaceLocked: vi.fn().mockReturnValue(false),
      buildSaveErrorResponse: vi.fn().mockReturnValue({ status: 400, payload: { code: 'predictions_missing' } }),
      formatBackendText: vi.fn().mockReturnValue('formatted'),
      backendText: { save: { saveRouteFailureTemplate: 'template', raceLockedDetailsTemplate: 'locked' } },
      appConfig: { uiText: { backend: { messages: { saveSuccess: 'ok' }, errors: { saveFailed: 'failed' } }, calendar: { raceLockedError: 'locked' } } },
      validatePredictions: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      buildPredictionsMissingResponse: vi.fn().mockReturnValue({ status: 400, payload: { code: 'predictions_missing' } }),
      writeAppData,
      classifySaveError: vi.fn(),
      extractErrorDetails: vi.fn(),
      runtimeEnvironment: 'development',
      databaseTargetName: 'fantaf1_dev',
      participantSlots: 3,
      predictionFieldOrder: ['first', 'second', 'third', 'pole'],
      createRequestId: vi.fn()
        .mockReturnValueOnce('req-1')
        .mockReturnValueOnce('req-2'),
    });

    const invalidRes = createResponseRecorder();
    await service.handleSaveRequest({ body: { users: [] } }, invalidRes, {
      requirePredictions: true,
      routePath: '/api/predictions',
    });
    expect(invalidRes.statusCode).toBe(400);

    const validRes = createResponseRecorder();
    await service.handleSaveRequest({ body: { users: [] } }, validRes, {
      requirePredictions: false,
      routePath: '/api/data',
    });
    expect(validRes.payload).toEqual({ message: 'ok' });
    expect(writeAppData).toHaveBeenCalled();
  });
});
