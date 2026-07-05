import type { Runner } from '@/shared/types/domain';

const RUNNER_STORAGE_KEY = 'trackLapTimer.runners';

function isValidRunner(input: unknown): input is Runner {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<Runner>;

  return (
    Number.isInteger(candidate.id) &&
    typeof candidate.name === 'string' &&
    (candidate.raceId === null || typeof candidate.raceId === 'string') &&
    (candidate.heatNumber === null || Number.isInteger(candidate.heatNumber))
  );
}

export function loadStoredRunners(): Runner[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(RUNNER_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidRunner).map((runner) => ({
      id: runner.id,
      name: runner.name,
      raceId: runner.raceId,
      heatNumber: runner.heatNumber,
    }));
  } catch {
    window.localStorage.removeItem(RUNNER_STORAGE_KEY);
    return [];
  }
}

export function saveStoredRunners(runners: Runner[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(RUNNER_STORAGE_KEY, JSON.stringify(runners));
}
