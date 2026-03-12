import { standingsApiUrl } from '../constants';
import type { StandingsPayload } from '../types';

export async function fetchOfficialStandings(): Promise<StandingsPayload> {
  const response = await fetch(standingsApiUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch official standings');
  }

  return response.json() as Promise<StandingsPayload>;
}
