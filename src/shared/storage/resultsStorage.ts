import type { ResultRecord } from '@/shared/types/domain';

const RESULT_STORAGE_KEY = 'trackLapTimer.results';

function isValidResultRecord(input: unknown): input is ResultRecord {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<ResultRecord>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.meetId === 'string' &&
    typeof candidate.raceId === 'string' &&
    Number.isInteger(candidate.heatNumber) &&
    Number.isInteger(candidate.runnerId) &&
    typeof candidate.runnerName === 'string' &&
    Number.isInteger(candidate.lapNumber) &&
    Number.isInteger(candidate.lapTime) &&
    Number.isInteger(candidate.totalTime) &&
    typeof candidate.recordedAt === 'string'
  );
}

export function loadStoredResults(): ResultRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(RESULT_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidResultRecord).map((entry) => ({
      id: entry.id,
      meetId: entry.meetId,
      raceId: entry.raceId,
      heatNumber: entry.heatNumber,
      sessionId:
        typeof entry.sessionId === 'string' && entry.sessionId
          ? entry.sessionId
          : `legacy-${entry.meetId}-${entry.raceId}-${entry.heatNumber}`,
      runnerId: entry.runnerId,
      runnerName: entry.runnerName,
      lapNumber: entry.lapNumber,
      lapTime: entry.lapTime,
      totalTime: entry.totalTime,
      recordedAt: entry.recordedAt,
      isFinishLap: Boolean(entry.isFinishLap),
    }));
  } catch {
    window.localStorage.removeItem(RESULT_STORAGE_KEY);
    return [];
  }
}

export function saveStoredResults(results: ResultRecord[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(results));
}
