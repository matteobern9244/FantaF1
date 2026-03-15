import { describe, expect, it, vi } from 'vitest';
import { ensureLocalAdminCredential, resolveLocalMongoUri } from '../scripts/local-admin-credential.mjs';
import { DEFAULT_LOCAL_DATABASES, resolveSaveSmokeTarget } from '../scripts/local-runtime-targets.mjs';

describe('local admin credential helper', () => {
  it('resolves the local mongo uri against the requested database target', () => {
    const mongoUri = resolveLocalMongoUri({
      env: {
        MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
      },
      fsImpl: {
        existsSync: () => false,
      },
      databaseTarget: DEFAULT_LOCAL_DATABASES.csharpStaging,
    });

    expect(mongoUri).toBe(
      'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_local_staging?retryWrites=true&w=majority',
    );
  });

  it('upserts the deterministic admin credential for targets that require it', async () => {
    const updateOne = vi.fn().mockResolvedValue({});
    const close = vi.fn().mockResolvedValue(undefined);
    const createConnectionImpl = vi.fn(() => ({
      asPromise: async () => ({
        collection: vi.fn(() => ({
          updateOne,
        })),
        close,
      }),
    }));
    const target = resolveSaveSmokeTarget({
      SAVE_SMOKE_TARGET: 'csharp-staging-local',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
    });

    const changed = await ensureLocalAdminCredential({
      targetConfig: target,
      createConnectionImpl,
      env: {
        MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
      },
      fsImpl: {
        existsSync: () => false,
      },
    });

    expect(changed).toBe(true);
    expect(createConnectionImpl).toHaveBeenCalledWith(
      'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_local_staging?retryWrites=true&w=majority',
    );
    expect(updateOne).toHaveBeenCalledWith(
      { role: 'admin' },
      expect.objectContaining({
        $set: expect.objectContaining({
          role: 'admin',
          passwordSalt: target.adminAuth.salt,
          passwordHash: target.startupEnv.AdminCredentialSeed__PasswordHashHex,
        }),
      }),
      { upsert: true },
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does nothing for targets that do not require admin auth', async () => {
    const changed = await ensureLocalAdminCredential({
      targetConfig: resolveSaveSmokeTarget({
        SAVE_SMOKE_TARGET: 'csharp-dev',
        MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
      }),
      createConnectionImpl: vi.fn(),
    });

    expect(changed).toBe(false);
  });

  it('rejects shared staging for local admin bootstrap', () => {
    expect(() => resolveLocalMongoUri({
      env: {
        MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_staging?retryWrites=true&w=majority',
      },
      fsImpl: {
        existsSync: () => false,
      },
      databaseTarget: 'fantaf1_staging',
    })).toThrow(
      'Il bootstrap locale delle credenziali admin non puo\' puntare al database condiviso "fantaf1_staging". Usa un database locale isolato.',
    );
  });
});
