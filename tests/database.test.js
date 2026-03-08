import { describe, expect, it } from 'vitest';
import {
  determineExpectedMongoDatabaseName,
  extractMongoDatabaseName,
  LOCAL_DATABASE_NAME,
  PRODUCTION_DATABASE_NAME,
  normalizeRuntimeEnvironment,
  resolveMongoDatabaseName,
  verifyMongoDatabaseName,
} from '../backend/database.js';

describe('MongoDB database target resolution', () => {
  it('uses fantaf1_dev outside production', () => {
    expect(determineExpectedMongoDatabaseName()).toBe(LOCAL_DATABASE_NAME);
    expect(determineExpectedMongoDatabaseName('development')).toBe(LOCAL_DATABASE_NAME);
    expect(determineExpectedMongoDatabaseName('test')).toBe(LOCAL_DATABASE_NAME);
  });

  it('uses fantaf1 in production', () => {
    expect(determineExpectedMongoDatabaseName('production')).toBe(PRODUCTION_DATABASE_NAME);
  });

  it('allows an explicit database override for isolated CI runs', () => {
    expect(
      determineExpectedMongoDatabaseName('development', {
        mongoDatabaseNameOverride: 'fantaf1_ci',
      }),
    ).toBe('fantaf1_ci');
    expect(
      determineExpectedMongoDatabaseName('production', {
        mongoDatabaseNameOverride: 'fantaf1_ci',
      }),
    ).toBe('fantaf1_ci');
  });

  it('ignores blank database overrides', () => {
    expect(
      determineExpectedMongoDatabaseName('development', {
        mongoDatabaseNameOverride: '   ',
      }),
    ).toBe(LOCAL_DATABASE_NAME);
  });

  it('extracts the database name from the MongoDB URI path', () => {
    expect(
      extractMongoDatabaseName(
        'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
      ),
    ).toBe(LOCAL_DATABASE_NAME);
  });

  it('returns undefined if the URI is empty or not a string', () => {
    expect(extractMongoDatabaseName('')).toBeUndefined();
    expect(extractMongoDatabaseName(null)).toBeUndefined();
    expect(extractMongoDatabaseName(undefined)).toBeUndefined();
  });

  it('returns undefined and handles parsing errors if the URI is not a valid URL', () => {
    expect(extractMongoDatabaseName('not-a-valid-url-at-all')).toBeUndefined();
  });

  it('falls back to the environment target when the MongoDB URI does not specify a database', () => {
    expect(
      resolveMongoDatabaseName({
        nodeEnv: 'production',
        mongoUri: 'mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority',
      }),
    ).toBe(PRODUCTION_DATABASE_NAME);
  });

  it('accepts a MongoDB URI aligned with the local environment', () => {
    expect(
      resolveMongoDatabaseName({
        nodeEnv: 'development',
        mongoUri: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
      }),
    ).toBe(LOCAL_DATABASE_NAME);
  });

  it('accepts a MongoDB URI aligned with the production environment', () => {
    expect(
      resolveMongoDatabaseName({
        nodeEnv: 'production',
        mongoUri: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1?retryWrites=true&w=majority',
      }),
    ).toBe(PRODUCTION_DATABASE_NAME);
  });

  it('accepts a MongoDB URI aligned with an explicit override database', () => {
    expect(
      resolveMongoDatabaseName({
        nodeEnv: 'development',
        mongoUri: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_ci?retryWrites=true&w=majority',
        mongoDatabaseNameOverride: 'fantaf1_ci',
      }),
    ).toBe('fantaf1_ci');
  });

  it('fails when the URI path targets the wrong local database', () => {
    expect(() =>
      resolveMongoDatabaseName({
        nodeEnv: 'development',
        mongoUri: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1?retryWrites=true&w=majority',
      }),
    ).toThrow('MONGODB_URI targets "fantaf1" but development requires "fantaf1_dev".');
  });

  it('fails when the URI path targets the wrong production database', () => {
    expect(() =>
      resolveMongoDatabaseName({
        nodeEnv: 'production',
        mongoUri: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
      }),
    ).toThrow('MONGODB_URI targets "fantaf1_dev" but production requires "fantaf1".');
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
