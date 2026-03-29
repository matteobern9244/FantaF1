import { describe, expect, it, vi } from 'vitest';
import { ensureLocalAdminCredential, resolveLocalMongoUri } from '../scripts/local-admin-credential.mjs';
import { DEFAULT_LOCAL_DATABASES, resolveSaveSmokeTarget } from '../scripts/local-runtime-targets.mjs';

describe('local admin credential helper', () => {
  it('resolves the local mongo uri against the requested database target', () => {
    const mongoUri = resolveLocalMongoUri({
      env: {
        MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1?retryWrites=true&w=majority',
      },
      fsImpl: {
        existsSync: () => false,
      },
      databaseTarget: DEFAULT_LOCAL_DATABASES.csharpDevelopment,
    });

    expect(mongoUri).toBe(
      'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
    );
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

  it('rejects the shared production database for local admin bootstrap', () => {
    expect(() => resolveLocalMongoUri({
      env: {
        MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1?retryWrites=true&w=majority',
      },
      fsImpl: {
        existsSync: () => false,
      },
      databaseTarget: 'fantaf1',
    })).toThrow(
      'Il bootstrap locale delle credenziali admin non puo\' puntare al database condiviso "fantaf1". Usa un database locale isolato.',
    );
  });
});
