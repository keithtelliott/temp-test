import { useMemo, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { addRace, setActiveRace } from '@/features/races/racesSlice';

export function RacesPanel() {
  const [raceName, setRaceName] = useState('');
  const dispatch = useAppDispatch();
  const races = useAppSelector((state) => state.races.items);
  const activeRaceId = useAppSelector((state) => state.races.activeRaceId);

  const activeRaceLabel = useMemo(
    () => races.find((race) => race.id === activeRaceId)?.name ?? 'No race selected',
    [activeRaceId, races],
  );

  function submitRace() {
    dispatch(addRace(raceName));
    setRaceName('');
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      submitRace();
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-card-foreground">Races</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage the race catalog used across meet setup and timer assignment flows.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-border/80 bg-muted/20 p-4 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          value={raceName}
          onChange={(event) => setRaceName(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Enter race name"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <Button type="button" className="h-10" onClick={submitRace}>
          Add Race
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground">
        Active race: <span className="font-semibold text-foreground">{activeRaceLabel}</span>
      </div>

      <div className="grid gap-2">
        {races.map((race) => {
          const isActive = race.id === activeRaceId;

          return (
            <button
              key={race.id}
              type="button"
              onClick={() => dispatch(setActiveRace(race.id))}
              className={[
                'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition',
                isActive
                  ? 'border-primary/40 bg-accent text-accent-foreground shadow-sm'
                  : 'border-border/70 bg-background hover:bg-muted/40',
              ].join(' ')}
            >
              <span className="font-semibold">{race.name}</span>
              <span className="text-xs text-muted-foreground">id: {race.id}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
