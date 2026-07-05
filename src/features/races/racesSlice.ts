import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Race } from '@/shared/types/domain';

interface RacesState {
  activeRaceId: string;
  items: Race[];
}

export const defaultRaces: Race[] = [
  { id: '1600', name: '1600 Meter' },
  { id: '800', name: '800 Meter' },
  { id: '3200', name: '3200 Meter' },
];

export function createInitialRacesState(): RacesState {
  return {
    activeRaceId: defaultRaces[0].id,
    items: defaultRaces,
  };
}

const initialState: RacesState = createInitialRacesState();

const racesSlice = createSlice({
  name: 'races',
  initialState,
  reducers: {
    addRace(state, action: PayloadAction<string>) {
      const name = action.payload.trim();

      if (!name) {
        return;
      }

      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const alreadyExists = state.items.some((race) => race.id === id);

      if (alreadyExists) {
        return;
      }

      state.items.push({ id, name });
      if (!state.activeRaceId) {
        state.activeRaceId = id;
      }
    },
    setActiveRace(state, action: PayloadAction<string>) {
      const exists = state.items.some((race) => race.id === action.payload);
      if (exists) {
        state.activeRaceId = action.payload;
      }
    },
  },
});

export const { addRace, setActiveRace } = racesSlice.actions;
export const racesReducer = racesSlice.reducer;
