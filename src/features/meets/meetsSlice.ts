import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Meet, RunnerAssignment } from '@/shared/types/domain';

interface MeetsState {
  activeMeetId: string;
  items: Meet[];
}

export const defaultMeetId = 'default-meet';

function createDefaultMeet(): Meet {
  return {
    id: defaultMeetId,
    name: 'Default Meet',
    roster: [],
    assignments: [],
  };
}

export function createInitialMeetsState(): MeetsState {
  return {
    activeMeetId: defaultMeetId,
    items: [createDefaultMeet()],
  };
}

const initialState: MeetsState = createInitialMeetsState();

const meetsSlice = createSlice({
  name: 'meets',
  initialState,
  reducers: {
    hydrateMeets(_state, action: PayloadAction<MeetsState>) {
      const { items, activeMeetId } = action.payload;

      if (items.length === 0) {
        return createInitialMeetsState();
      }

      const activeMeetExists = items.some((meet) => meet.id === activeMeetId);

      return {
        activeMeetId: activeMeetExists ? activeMeetId : items[0].id,
        items,
      };
    },
    addMeet(state, action: PayloadAction<string>) {
      const name = action.payload.trim();

      if (!name) {
        return;
      }

      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const alreadyExists = state.items.some((meet) => meet.id === id);

      if (alreadyExists) {
        return;
      }

      state.items.push({
        id,
        name,
        roster: [],
        assignments: [],
      });
      state.activeMeetId = id;
    },
    setActiveMeet(state, action: PayloadAction<string>) {
      const exists = state.items.some((meet) => meet.id === action.payload);
      if (exists) {
        state.activeMeetId = action.payload;
      }
    },
    addRunnerToMeet(state, action: PayloadAction<{ meetId: string; runnerId: number }>) {
      const meet = state.items.find((entry) => entry.id === action.payload.meetId);

      if (!meet) {
        return;
      }

      if (!meet.roster.includes(action.payload.runnerId)) {
        meet.roster.push(action.payload.runnerId);
      }
    },
    assignRunnerToRace(state, action: PayloadAction<{ meetId: string; assignment: RunnerAssignment }>) {
      const meet = state.items.find((entry) => entry.id === action.payload.meetId);

      if (!meet) {
        return;
      }

      const index = meet.assignments.findIndex(
        (assignment) => assignment.runnerId === action.payload.assignment.runnerId,
      );

      if (index >= 0) {
        meet.assignments[index] = action.payload.assignment;
      } else {
        meet.assignments.push(action.payload.assignment);
      }

      if (!meet.roster.includes(action.payload.assignment.runnerId)) {
        meet.roster.push(action.payload.assignment.runnerId);
      }
    },
  },
});

export const { hydrateMeets, addMeet, setActiveMeet, addRunnerToMeet, assignRunnerToRace } = meetsSlice.actions;
export const meetsReducer = meetsSlice.reducer;
