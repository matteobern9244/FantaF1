import 'dotenv/config';
import mongoose from 'mongoose';
import { AppData, Weekend } from '../backend/models.js';
import {
  determineExpectedMongoDatabaseName,
  normalizeRuntimeEnvironment,
  resolveMongoDatabaseName,
  verifyMongoDatabaseName,
} from '../backend/database.js';
import { sanitizeAppData } from '../backend/storage.js';
import { appConfig } from '../backend/config.js';
import { resolveParticipantRoster } from '../backend/validation.js';

const participantSlots = Number.isFinite(Number(appConfig.participantSlots))
  ? Number(appConfig.participantSlots)
  : 3;

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  const databaseTargetName = determineExpectedMongoDatabaseName(process.env.NODE_ENV);
  const resolvedDatabaseName = resolveMongoDatabaseName({
    nodeEnv: process.env.NODE_ENV,
    mongoUri: uri,
  });

  await mongoose.connect(uri, {
    dbName: databaseTargetName,
  });

  verifyMongoDatabaseName(mongoose.connection.db?.databaseName, databaseTargetName);

  console.log(
    `[Migration] Connected to ${resolvedDatabaseName} in ${normalizeRuntimeEnvironment(process.env.NODE_ENV)}`,
  );
}

async function readCalendar() {
  const weekends = await Weekend.find().sort({ roundNumber: 1 });
  return weekends.map((weekend) => weekend.toObject());
}

async function migrateWeekendBoostRemoval() {
  const calendar = await readCalendar();
  const documents = await AppData.find().sort({ createdAt: 1 });
  let updatedCount = 0;

  for (const document of documents) {
    const plainDocument = document.toObject();
    const participantRoster =
      resolveParticipantRoster(plainDocument.users, participantSlots) ?? null;
    const sanitized = sanitizeAppData(plainDocument, calendar, { participantRoster });

    await AppData.replaceOne(
      { _id: document._id },
      {
        ...sanitized,
        lastUpdated: plainDocument.lastUpdated ?? new Date(),
        createdAt: document.createdAt,
        updatedAt: new Date(),
      },
      { upsert: false },
    );

    updatedCount += 1;
  }

  console.log(`[Migration] Weekend Boost removed from ${updatedCount} AppData document(s).`);
}

try {
  await connectToDatabase();
  await migrateWeekendBoostRemoval();
  await mongoose.disconnect();
} catch (error) {
  console.error('[Migration] Failed to remove Weekend Boost:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
