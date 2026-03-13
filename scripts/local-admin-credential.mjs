import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { rewriteMongoDatabaseName } from './local-runtime-targets.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function loadEnvFile(filePath, { fsImpl = fs } = {}) {
  if (!fsImpl.existsSync(filePath)) {
    return {};
  }

  const parsedEntries = {};
  const fileContent = fsImpl.readFileSync(filePath, 'utf8');

  for (const rawLine of fileContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    parsedEntries[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }

  return parsedEntries;
}

function resolveLocalMongoUri({
  env = process.env,
  fsImpl = fs,
  pathImpl = path,
  projectRootPath = projectRoot,
  databaseTarget,
} = {}) {
  const mergedEnv = {
    ...env,
    ...loadEnvFile(pathImpl.join(projectRootPath, '.env'), { fsImpl }),
    ...loadEnvFile(pathImpl.join(projectRootPath, '.env.local'), { fsImpl }),
  };

  if (typeof mergedEnv.MONGODB_URI !== 'string' || !mergedEnv.MONGODB_URI.trim()) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  return rewriteMongoDatabaseName(mergedEnv.MONGODB_URI, databaseTarget);
}

async function ensureLocalAdminCredential({
  targetConfig,
  createConnectionImpl = mongoose.createConnection.bind(mongoose),
  env = process.env,
  fsImpl = fs,
  pathImpl = path,
  projectRootPath = projectRoot,
} = {}) {
  if (!targetConfig?.adminAuth?.password || !targetConfig?.adminAuth?.salt) {
    return false;
  }

  const mongoUri = resolveLocalMongoUri({
    env,
    fsImpl,
    pathImpl,
    projectRootPath,
    databaseTarget: targetConfig.expectedDatabaseTarget,
  });

  const connection = await createConnectionImpl(mongoUri).asPromise();

  try {
    await connection.collection('admincredentials').updateOne(
      { role: 'admin' },
      {
        $set: {
          role: 'admin',
          passwordHash: targetConfig.startupEnv.AdminCredentialSeed__PasswordHashHex,
          passwordSalt: targetConfig.adminAuth.salt,
        },
      },
      { upsert: true },
    );
  } finally {
    await connection.close();
  }

  return true;
}

export {
  ensureLocalAdminCredential,
  resolveLocalMongoUri,
};
