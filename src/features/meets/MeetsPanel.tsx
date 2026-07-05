import { useMemo, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { addMeet, setActiveMeet } from '@/features/meets/meetsSlice';

export function MeetsPanel() {
  const [meetName, setMeetName] = useState('');
  const dispatch = useAppDispatch();
  const meets = useAppSelector((state) => state.meets.items);
  const activeMeetId = useAppSelector((state) => state.meets.activeMeetId);

  const activeMeetLabel = useMemo(
    () => meets.find((meet) => meet.id === activeMeetId)?.name ?? 'No meet selected',
    [activeMeetId, meets],
  );

  function submitMeet() {
    dispatch(addMeet(meetName));
    setMeetName('');
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      submitMeet();
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-card-foreground">Meets</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create and select meets. Roster membership and race assignments are stored per meet.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-border/80 bg-muted/20 p-4 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          value={meetName}
          onChange={(event) => setMeetName(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Enter meet name"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <Button type="button" className="h-10" onClick={submitMeet}>
          Add Meet
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground">
        Active meet: <span className="font-semibold text-foreground">{activeMeetLabel}</span>
      </div>

      <div className="grid gap-2">
        {meets.map((meet) => {
          const isActive = meet.id === activeMeetId;
          const placementLabel = meet.assignments.length === 1 ? 'placement' : 'placements';

          return (
            <button
              key={meet.id}
              type="button"
              onClick={() => dispatch(setActiveMeet(meet.id))}
              className={[
                'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition',
                isActive
                  ? 'border-primary/40 bg-accent text-accent-foreground shadow-sm'
                  : 'border-border/70 bg-background hover:bg-muted/40',
              ].join(' ')}
            >
              <span className="font-semibold">{meet.name}</span>
              <span className="text-xs text-muted-foreground">
                {meet.roster.length} rostered, {meet.assignments.length} {placementLabel}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
