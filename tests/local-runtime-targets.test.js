import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RUNTIME_TARGET,
  buildProbeUrls,
  createDeterministicAdminPassword,
  createDeterministicAdminSalt,
  rewriteMongoDatabaseName,
  resolveLauncherTarget,
  resolveLocalRuntimeTarget,
  resolveSaveSmokeTarget,
  resolveUiResponsiveTarget,
} from '../scripts/local-runtime-targets.mjs';

describe('local runtime targets', () => {
  it('uses csharp-dev as the canonical default target', () => {
    const target = resolveLocalRuntimeTarget();

    expect(DEFAULT_RUNTIME_TARGET).toBe('csharp-dev');
    expect(target.name).toBe('csharp-dev');
    expect(target.baseUrl).toBe('http://127.0.0.1:5173');
    expect(target.backendHealthUrl).toBe('http://127.0.0.1:3002/api/health');
    expect(target.expectedEnvironment).toBe('development');
    expect(target.expectedDatabaseTarget).toBe('fantaf1_staging');
    expect(target.appProbeUrls).toEqual(buildProbeUrls('http://127.0.0.1:3002'));
  });

  it('resolves the integrated C# development target with split startup', () => {
    const target = resolveLocalRuntimeTarget('csharp-dev');

    expect(target.runtime).toBe('csharp');
    expect(target.frontendMode).toBe('split');
    expect(target.baseUrl).toBe('http://127.0.0.1:5173');
    expect(target.backendCommand).toBe('dotnet');
    expect(target.startupEnv).toEqual({
      ASPNETCORE_ENVIRONMENT: 'Development',
      ASPNETCORE_URLS: 'http://127.0.0.1:3002',
    });
    expect(target.expectedDatabaseTarget).toBe('fantaf1_staging');
  });

  it('resolves the local staging target without falling back to fantaf1_dev', () => {
    const target = resolveLocalRuntimeTarget('csharp-staging-local');

    expect(target.baseUrl).toBe('http://127.0.0.1:3003');
    expect(target.expectedEnvironment).toBe('staging');
    expect(target.expectedDatabaseTarget).toBe('fantaf1_staging');
    expect(target.adminAuth).toEqual({
      passwordSeedLabel: 'subphase-9-staging-local-admin-password',
      saltSeedLabel: 'subphase-9-staging-local-admin-salt',
    });
  });

  it('rejects unknown runtime targets explicitly', () => {
    expect(() => resolveLocalRuntimeTarget('legacy')).toThrow(
      'Target runtime locale non supportato: "legacy".',
    );
  });

  it('allows explicit overrides without changing the selected target identity', () => {
    const target = resolveLocalRuntimeTarget('csharp-dev', {
      baseUrl: 'http://127.0.0.1:4300',
      backendHealthUrl: 'http://127.0.0.1:4300/api/health',
      expectedEnvironment: 'ci',
      expectedDatabaseTarget: 'fantaf1_porting_ci',
    });

    expect(target.name).toBe('csharp-dev');
    expect(target.baseUrl).toBe('http://127.0.0.1:4300');
    expect(target.backendHealthUrl).toBe('http://127.0.0.1:4300/api/health');
    expect(target.expectedEnvironment).toBe('ci');
    expect(target.expectedDatabaseTarget).toBe('fantaf1_porting_ci');
    expect(target.appProbeUrls).toEqual(buildProbeUrls('http://127.0.0.1:4300'));
  });

  it('resolves save smoke target from dedicated env vars first', () => {
    const target = resolveSaveSmokeTarget({
      SAVE_SMOKE_TARGET: 'csharp-dev',
      SAVE_SMOKE_BASE_URL: 'http://127.0.0.1:4301',
      SAVE_SMOKE_BACKEND_HEALTH_URL: 'http://127.0.0.1:4301/api/health',
      SAVE_SMOKE_EXPECTED_ENVIRONMENT: 'development',
      SAVE_SMOKE_EXPECTED_DATABASE_TARGET: 'fantaf1_porting',
      FANTAF1_LOCAL_RUNTIME: 'node-dev',
    });

    expect(target.name).toBe('csharp-dev');
    expect(target.baseUrl).toBe('http://127.0.0.1:4301');
  });

  it('rewrites the csharp runtime mongo uri to the explicit staging database target', () => {
    const target = resolveSaveSmokeTarget({
      SAVE_SMOKE_TARGET: 'csharp-dev',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
    });

    expect(target.startupEnv.MONGODB_DB_NAME_OVERRIDE).toBe('fantaf1_staging');
    expect(target.startupEnv.MONGODB_URI).toBe(
      'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_staging?retryWrites=true&w=majority',
    );
  });

  it('materializes deterministic staging admin seed credentials without storing plaintext', () => {
    const target = resolveSaveSmokeTarget({
      SAVE_SMOKE_TARGET: 'csharp-staging-local',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
    });

    expect(target.adminAuth.password).toBe(
      createDeterministicAdminPassword('subphase-9-staging-local-admin-password'),
    );
    expect(target.adminAuth.salt).toBe(
      createDeterministicAdminSalt('subphase-9-staging-local-admin-salt'),
    );
    expect(target.startupEnv.AdminCredentialSeed__PasswordSalt).toBe(target.adminAuth.salt);
    expect(target.startupEnv.AdminCredentialSeed__PasswordHashHex).toHaveLength(128);
  });

  it('uses the backend base url for the default save smoke target', () => {
    const target = resolveSaveSmokeTarget({});

    expect(target.name).toBe('csharp-dev');
    expect(target.baseUrl).toBe('http://127.0.0.1:3002');
    expect(target.backendHealthUrl).toBe('http://127.0.0.1:3002/api/health');
  });

  it('reuses the launcher target when save smoke target is not provided', () => {
    const target = resolveSaveSmokeTarget({
      FANTAF1_LOCAL_RUNTIME: 'csharp-staging-local',
    });

    expect(target.name).toBe('csharp-staging-local');
    expect(target.expectedDatabaseTarget).toBe('fantaf1_staging');
  });

  it('resolves ui responsive target from its dedicated env namespace', () => {
    const target = resolveUiResponsiveTarget({
      UI_RESPONSIVE_TARGET: 'csharp-staging-local',
      UI_RESPONSIVE_BASE_URL: 'http://127.0.0.1:4302',
      UI_RESPONSIVE_BACKEND_HEALTH_URL: 'http://127.0.0.1:4302/api/health',
    });

    expect(target.name).toBe('csharp-staging-local');
    expect(target.baseUrl).toBe('http://127.0.0.1:4302');
    expect(target.backendHealthUrl).toBe('http://127.0.0.1:4302/api/health');
  });

  it('uses the canonical launcher target default when no launcher env is set', () => {
    const target = resolveLauncherTarget({});

    expect(target.name).toBe('csharp-dev');
    expect(target.busyPorts).toEqual([3002, 5173]);
  });

  it('rewrites mongo database names without touching unrelated uri parts', () => {
    expect(
      rewriteMongoDatabaseName(
        'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
        'fantaf1_staging',
      ),
    ).toBe('mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_staging?retryWrites=true&w=majority');
    expect(rewriteMongoDatabaseName('', 'fantaf1_staging')).toBe('');
  });
});
