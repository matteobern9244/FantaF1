import rawConfig from '../config/app-config.json';
import pkg from '../package.json';
import type { PredictionKey } from './types';

const appVersion = pkg.version;
const currentYear = new Date().getFullYear();
const backendOrigin = ''; // Use relative path for production compatibility
const frontendOrigin = ''; // Use relative path for production compatibility

function resolveVisibleAppTitle(localAppName: string | undefined, fallbackTitle: string) {
  const normalizedLocalAppName = typeof localAppName === 'string' ? localAppName.trim() : '';
  return normalizedLocalAppName.length > 0 ? normalizedLocalAppName : fallbackTitle;
}

const visibleAppTitle = resolveVisibleAppTitle(import.meta.env.VITE_APP_LOCAL_NAME, rawConfig.app.title);
const genericAppTitle = rawConfig.app.title;

const appConfig = {
  ...rawConfig,
  app: {
    ...rawConfig.app,
    currentYear,
  },
  runtime: {
    currentYear,
    displayTitle: visibleAppTitle,
  },
  api: {
    ...rawConfig.api,
    backendOrigin,
    frontendOrigin,
  },
  driversSource: {
    ...rawConfig.driversSource,
    statsUrl: `${rawConfig.driversSource.statsBaseUrl}/${currentYear}.aspx`,
  },
  calendarSource: {
    ...rawConfig.calendarSource,
    seasonUrl: `${rawConfig.calendarSource.baseUrl}/${currentYear}`,
  },
};

const dataApiUrl = `${backendOrigin}${appConfig.api.dataPath}`;
const predictionsApiUrl = `${backendOrigin}${appConfig.api.predictionsPath}`;
const driversApiUrl = `${backendOrigin}${appConfig.api.driversPath}`;
const calendarApiUrl = `${backendOrigin}${appConfig.api.calendarPath}`;
const healthApiUrl = `${backendOrigin}${appConfig.api.healthPath}`;
const predictionFieldOrder: PredictionKey[] = ['first', 'second', 'third', 'pole'];

export {
  appConfig,
  appVersion,
  backendOrigin,
  calendarApiUrl,
  currentYear,
  dataApiUrl,
  driversApiUrl,
  frontendOrigin,
  genericAppTitle,
  healthApiUrl,
  predictionsApiUrl,
  predictionFieldOrder,
  resolveVisibleAppTitle,
  visibleAppTitle,
};
