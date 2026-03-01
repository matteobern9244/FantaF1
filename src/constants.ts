import rawConfig from '../config/app-config.json';
import type { PredictionKey } from './types';

const currentYear = new Date().getFullYear();
const backendOrigin = ''; // Use relative path for production compatibility
const frontendOrigin = ''; // Use relative path for production compatibility
const visibleAppTitle = (import.meta.env.VITE_APP_LOCAL_NAME ?? '').trim() || rawConfig.app.title;
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
const driversApiUrl = `${backendOrigin}${appConfig.api.driversPath}`;
const calendarApiUrl = `${backendOrigin}${appConfig.api.calendarPath}`;
const healthApiUrl = `${backendOrigin}${appConfig.api.healthPath}`;
const predictionFieldOrder: PredictionKey[] = ['first', 'second', 'third', 'pole'];

export {
  appConfig,
  backendOrigin,
  calendarApiUrl,
  currentYear,
  dataApiUrl,
  driversApiUrl,
  frontendOrigin,
  genericAppTitle,
  healthApiUrl,
  predictionFieldOrder,
  visibleAppTitle,
};
