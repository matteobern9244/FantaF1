import type { OfficialResultsResponse, Prediction } from '../types';

export async function fetchOfficialResults(meetingKey: string): Promise<OfficialResultsResponse | Prediction> {
  const response = await fetch(`/api/results/${meetingKey}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch official results for ${meetingKey}`);
  }

  return response.json() as Promise<OfficialResultsResponse | Prediction>;
}

export function normalizeOfficialResultsResponse(payload: OfficialResultsResponse | Prediction) {
  if ('results' in payload && payload.results) {
    return {
      racePhase: payload.racePhase,
      results: payload.results,
      highlightsVideoUrl: payload.highlightsVideoUrl ?? '',
    };
  }

  return {
    racePhase: 'racePhase' in payload ? payload.racePhase : 'open',
    results: {
      first: payload.first ?? '',
      second: payload.second ?? '',
      third: payload.third ?? '',
      pole: payload.pole ?? '',
    },
    highlightsVideoUrl: 'highlightsVideoUrl' in payload ? payload.highlightsVideoUrl ?? '' : '',
  };
}
