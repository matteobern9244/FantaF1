import 'dotenv/config'; // Load env vars
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncCalendarFromOfficialSource, sortCalendarByRound, fetchRaceResults } from './backend/calendar.js';
import { appConfig, currentYear, formatConfigText } from './backend/config.js';
import { sortDriversAlphabetically, syncDriversFromOfficialSource } from './backend/drivers.js';
import {
  readAppData,
  readCalendarCache,
  readDriversCache,
  writeAppData,
} from './backend/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || appConfig.server.port;
const HOST = '0.0.0.0'; // Bind to all interfaces for Render

app.use(cors());
app.use(express.json());

// 1. Health check route
app.get(appConfig.api.healthPath, (req, res) => {
  res.json({
    status: 'ok',
    year: currentYear,
    dbState: mongoose.connection.readyState,
  });
});

// 2. API Routes
app.get(appConfig.api.dataPath, async (req, res) => {
  try {
    const data = await readAppData();
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to read app data' });
  }
});

app.get(appConfig.api.driversPath, async (req, res) => {
  try {
    const cachedDrivers = sortDriversAlphabetically(await readDriversCache());
    res.json(cachedDrivers);
  } catch {
    res.status(500).json({ error: 'Failed to read drivers' });
  }
});

app.get(appConfig.api.calendarPath, async (req, res) => {
  try {
    const cachedCalendar = sortCalendarByRound(await readCalendarCache());
    res.json(cachedCalendar);
  } catch {
    res.status(500).json({ error: 'Failed to read calendar' });
  }
});

app.get('/api/results/:meetingKey', async (req, res) => {
  try {
    const results = await fetchRaceResults(req.params.meetingKey);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results', details: error.message });
  }
});

app.post(appConfig.api.dataPath, async (req, res) => {
  try {
    await writeAppData(req.body);
    res.json({ message: appConfig.uiText.backend.messages.saveSuccess });
  } catch (error) {
    res.status(500).json({
      error: appConfig.uiText.backend.errors.saveFailed,
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// 3. Serve static files from 'dist' directory (Vite build)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// 4. Catch-all middleware for client-side routing (SPA)
// Using app.use instead of app.get('*') to bypass Express 5 path-to-regexp issues
app.use((req, res) => {
  // If it's an API call that wasn't matched above, return 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API Endpoint not found' });
  }
  // Otherwise, serve index.html for any other route (SPA)
  res.sendFile(path.join(distPath, 'index.html'));
});

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function startServer() {
  await connectToDatabase();

  try {
    const syncedDrivers = await syncDriversFromOfficialSource();
    if (syncedDrivers.length === 0) {
      console.warn(appConfig.uiText.backend.errors.driversUnavailable);
    }
  } catch (e) {
    console.warn('Driver sync warning:', e.message);
  }

  try {
    const syncedCalendar = await syncCalendarFromOfficialSource();
    if (syncedCalendar.length === 0) {
      console.warn(appConfig.uiText.backend.errors.calendarUnavailable);
    }
  } catch (e) {
    console.warn('Calendar sync warning:', e.message);
  }

  app.listen(PORT, HOST, () => {
    console.log(
      formatConfigText(appConfig.uiText.backend.logs.serverStarted, {
        origin: `http://${HOST}:${PORT}`,
      }),
    );
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
