import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'F1Result', 'data.json');
const DRIVERS_FILE = path.join(__dirname, 'F1Result', 'drivers.json');

// Function to sync drivers from a "Master" source
async function syncDrivers() {
  console.log('Scanning for official F1 2026 driver updates...');
  try {
    // Attempting to fetch from a reliable F1 data source (simulated for 2026)
    // In a real scenario, this would be an API like api.openf1.org or similar
    const response = await fetch('https://raw.githubusercontent.com/f1-data/grids/main/2026_drivers.json');
    if (response.ok) {
      const remoteDrivers = await response.json();
      fs.writeFileSync(DRIVERS_FILE, JSON.stringify(remoteDrivers, null, 2));
      console.log('Driver list updated successfully from official source.');
    } else {
      console.log('Remote source not reachable, using local drivers.json cache.');
    }
  } catch (err) {
    console.log('Offline or source unavailable. Driver list loaded from F1Result/drivers.json.');
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// Sync drivers at startup
syncDrivers();

// Get all data
app.get('/api/data', (req, res) => {
  if (!fs.existsSync(DATA_FILE)) {
    return res.json({ users: [], history: [], gpName: "", raceResults: { first: "", second: "", third: "", pole: "" } });
  }
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  res.json(JSON.parse(data));
});

// Get drivers
app.get('/api/drivers', (req, res) => {
  if (!fs.existsSync(DRIVERS_FILE)) {
    return res.status(404).json({ error: 'Drivers not found' });
  }
  const data = fs.readFileSync(DRIVERS_FILE, 'utf8');
  res.json(JSON.parse(data));
});

// Save data
app.post('/api/data', (req, res) => {
  const data = JSON.stringify(req.body, null, 2);
  fs.writeFileSync(DATA_FILE, data);
  res.json({ message: 'Saved successfully!' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
