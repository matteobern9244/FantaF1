import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCAL_DATABASES,
  DEFAULT_RUNTIME_TARGET,
  assertSafeLocalDatabaseTarget,
  assertSafeLocalMongoUri,
  buildProbeUrls,
  rewriteMongoDatabaseName,
  resolveLauncherTarget,
  resolveLocalRuntimeTarget,
  resolveSaveSmokeTarget,
} from '../scripts/local-runtime-targets.mjs';

describe('local runtime targets', () => {
  it('uses csharp-dev as the canonical default target', () => {
    const target = resolveLocalRuntimeTarget();

    expect(DEFAULT_RUNTIME_TARGET).toBe('csharp-dev');
    expect(target.name).toBe('csharp-dev');
    expect(target.baseUrl).toBe('http://127.0.0.1:5173');
    expect(target.backendHealthUrl).toBe('http://127.0.0.1:3002/api/health');
    expect(target.expectedEnvironment).toBe('development');
    expect(target.expectedDatabaseTarget).toBe(DEFAULT_LOCAL_DATABASES.csharpDevelopment);
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
    expect(target.expectedDatabaseTarget).toBe(DEFAULT_LOCAL_DATABASES.csharpDevelopment);
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

  it('keeps the csharp runtime mongo uri aligned to the canonical development database target', () => {
    const target = resolveSaveSmokeTarget({
      SAVE_SMOKE_TARGET: 'csharp-dev',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
    });

    expect(target.startupEnv.MONGODB_DB_NAME_OVERRIDE).toBe(DEFAULT_LOCAL_DATABASES.csharpDevelopment);
    expect(target.startupEnv.MONGODB_URI).toBe(
      'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
    );
  });

  it('uses the backend base url for the default save smoke target', () => {
    const target = resolveSaveSmokeTarget({});

    expect(target.name).toBe('csharp-dev');
    expect(target.baseUrl).toBe('http://127.0.0.1:3002');
    expect(target.backendHealthUrl).toBe('http://127.0.0.1:3002/api/health');
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
        'fantaf1_ci',
      ),
    ).toBe('mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_ci?retryWrites=true&w=majority');
    expect(rewriteMongoDatabaseName('', 'fantaf1_ci')).toBe('');
  });

  it('rejects the shared production database as a local mutable database target', () => {
    expect(() => assertSafeLocalDatabaseTarget('fantaf1', 'test target')).toThrow(
      'test target non puo\' puntare al database condiviso "fantaf1". Usa un database locale isolato.',
    );
    expect(() => assertSafeLocalMongoUri(
      'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1?retryWrites=true&w=majority',
      'test uri',
    )).toThrow(
      'test uri non puo\' puntare al database condiviso "fantaf1". Usa un database locale isolato.',
    );
  });

  it('ignores shared database overrides coming from ambient local env and keeps the canonical isolated target', () => {
    const saveTarget = resolveSaveSmokeTarget({
      SAVE_SMOKE_TARGET: 'csharp-dev',
      SAVE_SMOKE_EXPECTED_DATABASE_TARGET: 'fantaf1',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
    });
    const launcherTarget = resolveLauncherTarget({
      FANTAF1_LOCAL_RUNTIME: 'csharp-dev',
      FANTAF1_EXPECTED_DATABASE_TARGET: 'fantaf1',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
    });

    expect(saveTarget.expectedDatabaseTarget).toBe(DEFAULT_LOCAL_DATABASES.csharpDevelopment);
    expect(saveTarget.startupEnv.MONGODB_DB_NAME_OVERRIDE).toBe(DEFAULT_LOCAL_DATABASES.csharpDevelopment);
    expect(launcherTarget.expectedDatabaseTarget).toBe(DEFAULT_LOCAL_DATABASES.csharpDevelopment);
  });
});
