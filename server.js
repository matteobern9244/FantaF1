import cors from 'cors';
import express from 'express';
import { syncCalendarFromOfficialSource, sortCalendarByRound } from './backend/calendar.js';
import { appConfig, currentYear, formatConfigText } from './backend/config.js';
import { sortDriversAlphabetically, syncDriversFromOfficialSource } from './backend/drivers.js';
import {
  readAppData,
  readCalendarCache,
  readDriversCache,
  writeAppData,
} from './backend/storage.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get(appConfig.api.healthPath, (req, res) => {
  res.json({
    status: 'ok',
    year: currentYear,
  });
});

app.get(appConfig.api.dataPath, (req, res) => {
  res.json(readAppData(readCalendarCache()));
});

app.get(appConfig.api.driversPath, (req, res) => {
  const cachedDrivers = sortDriversAlphabetically(readDriversCache());
  res.json(cachedDrivers);
});

app.get(appConfig.api.calendarPath, (req, res) => {
  const cachedCalendar = sortCalendarByRound(readCalendarCache());
  res.json(cachedCalendar);
});

app.post(appConfig.api.dataPath, (req, res) => {
  try {
    writeAppData(req.body, readCalendarCache());
    res.json({ message: appConfig.uiText.backend.messages.saveSuccess });
  } catch (error) {
    res.status(500).json({
      error: appConfig.uiText.backend.errors.saveFailed,
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

async function startServer() {
  const syncedDrivers = await syncDriversFromOfficialSource();
  const syncedCalendar = await syncCalendarFromOfficialSource();

  if (syncedDrivers.length === 0) {
    throw new Error(appConfig.uiText.backend.errors.driversUnavailable);
  }

  if (syncedCalendar.length === 0) {
    throw new Error(appConfig.uiText.backend.errors.calendarUnavailable);
  }

  app.listen(appConfig.server.port, appConfig.server.host, () => {
    console.log(
      formatConfigText(appConfig.uiText.backend.logs.serverStarted, {
        origin: appConfig.api.backendOrigin,
      }),
    );
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
