import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const configFilePath = path.join(projectRoot, 'config', 'app-config.json');

const baseConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
const currentYear = new Date().getFullYear();
const localDisplayName = (process.env.VITE_APP_LOCAL_NAME ?? '').trim();
const serverOrigin = `http://${baseConfig.server.host}:${baseConfig.server.port}`;
const frontendOrigin = `http://${baseConfig.frontend.host}:${baseConfig.frontend.port}`;

const appConfig = {
  ...baseConfig,
  app: {
    ...baseConfig.app,
    currentYear,
  },
  runtime: {
    currentYear,
    displayTitle: localDisplayName || baseConfig.app.title,
  },
  api: {
    ...baseConfig.api,
    backendOrigin: serverOrigin,
    frontendOrigin,
  },
  driversSource: {
    ...baseConfig.driversSource,
    statsUrl: `${baseConfig.driversSource.statsBaseUrl}/${currentYear}.aspx`,
  },
  calendarSource: {
    ...baseConfig.calendarSource,
    seasonUrl: `${baseConfig.calendarSource.baseUrl}/${currentYear}`,
  },
  standingsSource: {
    ...baseConfig.standingsSource,
    driversUrl: `${baseConfig.standingsSource.baseUrl}/${formatConfigText(baseConfig.standingsSource.driversPathTemplate, { year: currentYear })}`,
    constructorsUrl: `${baseConfig.standingsSource.baseUrl}/${formatConfigText(baseConfig.standingsSource.constructorsPathTemplate, { year: currentYear })}`,
  },
};

function formatConfigText(template, replacements = {}) {
  return Object.entries(replacements).reduce((value, [key, replacement]) => {
    return value.split(`{${key}}`).join(String(replacement));
  }, template);
}

function getBrowserHeaders() {
  return {
    'user-agent': appConfig.driversSource.requestHeaders.userAgent,
    'accept-language': appConfig.driversSource.requestHeaders.acceptLanguage,
  };
}

export { appConfig, currentYear, formatConfigText, getBrowserHeaders, projectRoot };
