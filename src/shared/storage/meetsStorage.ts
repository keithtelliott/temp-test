import type { Meet, RunnerAssignment } from '@/shared/types/domain';

const MEET_STORAGE_KEY = 'trackLapTimer.meets';
const ACTIVE_MEET_STORAGE_KEY = 'trackLapTimer.activeMeetId';

function isValidAssignment(input: unknown): input is RunnerAssignment {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<RunnerAssignment>;

  return (
    Number.isInteger(candidate.runnerId) &&
    typeof candidate.raceId === 'string' &&
    Number.isInteger(candidate.heatNumber)
  );
}

function isValidMeet(input: unknown): input is Meet {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<Meet>;

  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
    return false;
  }

  const rosterIsValid = Array.isArray(candidate.roster) && candidate.roster.every((runnerId) => Number.isInteger(runnerId));
  const assignmentsAreValid =
    Array.isArray(candidate.assignments) && candidate.assignments.every((assignment) => isValidAssignment(assignment));

  return rosterIsValid && assignmentsAreValid;
}

export interface StoredMeetsPayload {
  activeMeetId: string | null;
  items: Meet[];
}

export function loadStoredMeets(): StoredMeetsPayload {
  if (typeof window === 'undefined') {
    return { activeMeetId: null, items: [] };
  }

  const rawMeets = window.localStorage.getItem(MEET_STORAGE_KEY);
  const rawActiveMeetId = window.localStorage.getItem(ACTIVE_MEET_STORAGE_KEY);

  if (!rawMeets) {
    return {
      activeMeetId: typeof rawActiveMeetId === 'string' && rawActiveMeetId ? rawActiveMeetId : null,
      items: [],
    };
  }

  try {
    const parsed = JSON.parse(rawMeets);

    if (!Array.isArray(parsed)) {
      return { activeMeetId: null, items: [] };
    }

    const items = parsed
      .filter((meet) => isValidMeet(meet))
      .map((meet) => {
        const assignmentRoster = meet.assignments.map((assignment) => assignment.runnerId);

        return {
          id: meet.id,
          name: meet.name,
          roster: [...new Set([...meet.roster, ...assignmentRoster])],
          assignments: meet.assignments.map((assignment) => ({
            runnerId: assignment.runnerId,
            raceId: assignment.raceId,
            heatNumber: assignment.heatNumber,
          })),
        };
      });

    const activeMeetId =
      typeof rawActiveMeetId === 'string' && rawActiveMeetId && items.some((meet) => meet.id === rawActiveMeetId)
        ? rawActiveMeetId
        : null;

    return { activeMeetId, items };
  } catch {
    window.localStorage.removeItem(MEET_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_MEET_STORAGE_KEY);
    return { activeMeetId: null, items: [] };
  }
}

export function saveStoredMeets(payload: StoredMeetsPayload): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(MEET_STORAGE_KEY, JSON.stringify(payload.items));

  if (payload.activeMeetId) {
    window.localStorage.setItem(ACTIVE_MEET_STORAGE_KEY, payload.activeMeetId);
  } else {
    window.localStorage.removeItem(ACTIVE_MEET_STORAGE_KEY);
  }
}
