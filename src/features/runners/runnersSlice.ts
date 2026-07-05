import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Runner } from '@/shared/types/domain';

interface RunnersState {
  items: Runner[];
  nextRunnerId: number;
}

const initialState: RunnersState = {
  items: [],
  nextRunnerId: 1,
};

const runnersSlice = createSlice({
  name: 'runners',
  initialState,
  reducers: {
    hydrateRunners(state, action: PayloadAction<Runner[]>) {
      state.items = action.payload;
      state.nextRunnerId = action.payload.reduce((maxId, runner) => Math.max(maxId, runner.id), 0) + 1;
    },
    addRunner(state, action: PayloadAction<string>) {
      const name = action.payload.trim();

      if (!name) {
        return;
      }

      state.items.push({
        id: state.nextRunnerId,
        name,
        raceId: null,
        heatNumber: null,
      });
      state.nextRunnerId += 1;
    },
  },
});

export const { addRunner, hydrateRunners } = runnersSlice.actions;
export const runnersReducer = runnersSlice.reducer;
