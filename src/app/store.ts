import { configureStore } from '@reduxjs/toolkit';
import { createInitialMeetsState } from '@/features/meets/meetsSlice';
import { meetsReducer } from '@/features/meets/meetsSlice';
import { createInitialRacesState } from '@/features/races/racesSlice';
import { racesReducer } from '@/features/races/racesSlice';
import { resultsReducer } from '@/features/results/resultsSlice';
import { runnersReducer } from '@/features/runners/runnersSlice';
import { loadStoredMeets, saveStoredMeets } from '@/shared/storage/meetsStorage';
import { loadStoredRaces, saveStoredRaces } from '@/shared/storage/racesStorage';
import { loadStoredResults, saveStoredResults } from '@/shared/storage/resultsStorage';
import { loadStoredRunners, saveStoredRunners } from '@/shared/storage/runnersStorage';

const storedMeets = loadStoredMeets();
const fallbackMeetsState = createInitialMeetsState();
const meetsItems = storedMeets.items.length > 0 ? storedMeets.items : fallbackMeetsState.items;
const meetsActiveMeetId =
  storedMeets.activeMeetId && meetsItems.some((meet) => meet.id === storedMeets.activeMeetId)
    ? storedMeets.activeMeetId
    : meetsItems[0].id;

const storedRaces = loadStoredRaces();
const fallbackRacesState = createInitialRacesState();
const racesItems = storedRaces.items.length > 0 ? storedRaces.items : fallbackRacesState.items;
const racesActiveRaceId =
  storedRaces.activeRaceId && racesItems.some((race) => race.id === storedRaces.activeRaceId)
    ? storedRaces.activeRaceId
    : racesItems[0].id;

const preloadedState = {
  meets: {
    activeMeetId: meetsActiveMeetId,
    items: meetsItems,
  },
  races: {
    activeRaceId: racesActiveRaceId,
    items: racesItems,
  },
  results: {
    items: loadStoredResults(),
  },
  runners: {
    items: loadStoredRunners(),
    nextRunnerId: 1,
  },
};

preloadedState.runners.nextRunnerId =
  preloadedState.runners.items.reduce((maxId, runner) => Math.max(maxId, runner.id), 0) + 1;

export const store = configureStore({
  reducer: {
    meets: meetsReducer,
    races: racesReducer,
    results: resultsReducer,
    runners: runnersReducer,
  },
  preloadedState,
});

store.subscribe(() => {
  const state = store.getState();

  saveStoredRunners(state.runners.items);
  saveStoredMeets({
    activeMeetId: state.meets.activeMeetId,
    items: state.meets.items,
  });
  saveStoredRaces({
    activeRaceId: state.races.activeRaceId,
    items: state.races.items,
  });
  saveStoredResults(state.results.items);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
