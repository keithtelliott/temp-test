import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ResultRecord } from '@/shared/types/domain';

interface ResultsState {
  items: ResultRecord[];
}

const initialState: ResultsState = {
  items: [],
};

const resultsSlice = createSlice({
  name: 'results',
  initialState,
  reducers: {
    appendResult(state, action: PayloadAction<ResultRecord>) {
      state.items.push(action.payload);
    },
    clearResults(state) {
      state.items = [];
    },
    clearResultsByIds(state, action: PayloadAction<string[]>) {
      const idsToClear = new Set(action.payload);
      state.items = state.items.filter((entry) => !idsToClear.has(entry.id));
    },
  },
});

export const { appendResult, clearResults, clearResultsByIds } = resultsSlice.actions;
export const resultsReducer = resultsSlice.reducer;
