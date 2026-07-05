import type { Race } from '@/shared/types/domain';

const RACE_STORAGE_KEY = 'trackLapTimer.races';
const ACTIVE_RACE_STORAGE_KEY = 'trackLapTimer.activeRaceId';

function isValidRace(input: unknown): input is Race {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<Race>;

  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
}

export interface StoredRacesPayload {
  activeRaceId: string | null;
  items: Race[];
}

export function loadStoredRaces(): StoredRacesPayload {
  if (typeof window === 'undefined') {
    return { activeRaceId: null, items: [] };
  }

  const rawRaces = window.localStorage.getItem(RACE_STORAGE_KEY);
  const rawActiveRaceId = window.localStorage.getItem(ACTIVE_RACE_STORAGE_KEY);

  if (!rawRaces) {
    return {
      activeRaceId: typeof rawActiveRaceId === 'string' && rawActiveRaceId ? rawActiveRaceId : null,
      items: [],
    };
  }

  try {
    const parsed = JSON.parse(rawRaces);

    if (!Array.isArray(parsed)) {
      return { activeRaceId: null, items: [] };
    }

    const items = parsed
      .filter((race) => isValidRace(race))
      .map((race) => ({
        id: race.id,
        name: race.name,
      }));

    const activeRaceId =
      typeof rawActiveRaceId === 'string' && rawActiveRaceId && items.some((race) => race.id === rawActiveRaceId)
        ? rawActiveRaceId
        : null;

    return { activeRaceId, items };
  } catch {
    window.localStorage.removeItem(RACE_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_RACE_STORAGE_KEY);
    return { activeRaceId: null, items: [] };
  }
}

export function saveStoredRaces(payload: StoredRacesPayload): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(RACE_STORAGE_KEY, JSON.stringify(payload.items));

  if (payload.activeRaceId) {
    window.localStorage.setItem(ACTIVE_RACE_STORAGE_KEY, payload.activeRaceId);
  } else {
    window.localStorage.removeItem(ACTIVE_RACE_STORAGE_KEY);
  }
}
