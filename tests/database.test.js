import { describe, expect, it } from 'vitest';
import {
  LOCAL_DATABASE_NAME,
  PRODUCTION_DATABASE_NAME,
  normalizeRuntimeEnvironment,
  resolveMongoDatabaseName,
  verifyMongoDatabaseName,
} from '../backend/database.js';

describe('MongoDB database target resolution', () => {
  it('uses fantaf1_dev outside production', () => {
    expect(resolveMongoDatabaseName()).toBe(LOCAL_DATABASE_NAME);
    expect(resolveMongoDatabaseName({ nodeEnv: 'development' })).toBe(LOCAL_DATABASE_NAME);
    expect(resolveMongoDatabaseName({ nodeEnv: 'test' })).toBe(LOCAL_DATABASE_NAME);
  });

  it('uses fantaf1 in production', () => {
    expect(resolveMongoDatabaseName({ nodeEnv: 'production' })).toBe(PRODUCTION_DATABASE_NAME);
  });

  it('prefers an explicit database name override', () => {
    expect(
      resolveMongoDatabaseName({
        nodeEnv: 'production',
        explicitDbName: 'custom_db',
      }),
    ).toBe('custom_db');
  });

  it('normalizes runtime environment labels', () => {
    expect(normalizeRuntimeEnvironment()).toBe('development');
    expect(normalizeRuntimeEnvironment('production')).toBe('production');
    expect(normalizeRuntimeEnvironment('PRODUCTION')).toBe('production');
  });

  it('fails when the connected database does not match the expected target', () => {
    expect(() => verifyMongoDatabaseName('fantaf1', 'fantaf1_dev')).toThrow(
      'Connected to unexpected MongoDB database "fantaf1". Expected "fantaf1_dev".',
    );
  });

  it('accepts the expected target database', () => {
    expect(() => verifyMongoDatabaseName('fantaf1_dev', 'fantaf1_dev')).not.toThrow();
  });
});
