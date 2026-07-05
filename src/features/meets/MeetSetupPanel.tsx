import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { addRunnerToMeet, assignRunnerToRace, setActiveMeet } from '@/features/meets/meetsSlice';

function toHeatNumber(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function MeetSetupPanel() {
  const dispatch = useAppDispatch();
  const meets = useAppSelector((state) => state.meets.items);
  const activeMeetId = useAppSelector((state) => state.meets.activeMeetId);
  const runners = useAppSelector((state) => state.runners.items);
  const races = useAppSelector((state) => state.races.items);

  const activeMeet = useMemo(() => meets.find((meet) => meet.id === activeMeetId) ?? null, [activeMeetId, meets]);

  const rosteredRunners = useMemo(() => {
    if (!activeMeet) {
      return [];
    }

    const rosterSet = new Set(activeMeet.roster);
    return runners.filter((runner) => rosterSet.has(runner.id));
  }, [activeMeet, runners]);

  const nonRosteredRunners = useMemo(() => {
    if (!activeMeet) {
      return [];
    }

    const rosterSet = new Set(activeMeet.roster);
    return runners.filter((runner) => !rosterSet.has(runner.id));
  }, [activeMeet, runners]);

  const [runnerToAddId, setRunnerToAddId] = useState('');
  const [assignmentRunnerId, setAssignmentRunnerId] = useState('');
  const [assignmentRaceId, setAssignmentRaceId] = useState('');
  const [assignmentHeat, setAssignmentHeat] = useState('1');

  const effectiveRunnerToAddId =
    nonRosteredRunners.some((runner) => String(runner.id) === runnerToAddId)
      ? runnerToAddId
      : nonRosteredRunners[0]
        ? String(nonRosteredRunners[0].id)
        : '';

  const effectiveAssignmentRunnerId =
    rosteredRunners.some((runner) => String(runner.id) === assignmentRunnerId)
      ? assignmentRunnerId
      : rosteredRunners[0]
        ? String(rosteredRunners[0].id)
        : '';

  const effectiveAssignmentRaceId =
    races.some((race) => race.id === assignmentRaceId) ? assignmentRaceId : races[0] ? races[0].id : '';

  const groupedAssignments = useMemo(() => {
    if (!activeMeet) {
      return [];
    }

    const groups = new Map<string, { raceName: string; heatNumber: number; runnerNames: string[] }>();

    activeMeet.assignments.forEach((assignment) => {
      const raceName = races.find((race) => race.id === assignment.raceId)?.name ?? 'Unknown Race';
      const key = `${assignment.raceId}::${assignment.heatNumber}`;
      const runnerName = runners.find((runner) => runner.id === assignment.runnerId)?.name ?? `Runner ${assignment.runnerId}`;

      if (!groups.has(key)) {
        groups.set(key, { raceName, heatNumber: assignment.heatNumber, runnerNames: [] });
      }

      groups.get(key)?.runnerNames.push(runnerName);
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.raceName !== b.raceName) {
        return a.raceName.localeCompare(b.raceName);
      }

      return a.heatNumber - b.heatNumber;
    });
  }, [activeMeet, races, runners]);

  function handleAddRunnerToMeet() {
    if (!activeMeet || !effectiveRunnerToAddId) {
      return;
    }

    dispatch(
      addRunnerToMeet({
        meetId: activeMeet.id,
        runnerId: Number.parseInt(effectiveRunnerToAddId, 10),
      }),
    );
  }

  function handleAssignRunner() {
    if (!activeMeet || !effectiveAssignmentRunnerId || !effectiveAssignmentRaceId) {
      return;
    }

    dispatch(
      assignRunnerToRace({
        meetId: activeMeet.id,
        assignment: {
          runnerId: Number.parseInt(effectiveAssignmentRunnerId, 10),
          raceId: effectiveAssignmentRaceId,
          heatNumber: toHeatNumber(assignmentHeat),
        },
      }),
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-card-foreground">Meet Setup</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a meet, build roster membership, then assign each runner to race and heat.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-foreground">1. Choose Active Meet</span>
          <select
            value={activeMeetId}
            onChange={(event) => dispatch(setActiveMeet(event.target.value))}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            {meets.map((meet) => (
              <option key={meet.id} value={meet.id}>
                {meet.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">2. Add Runner To Meet Roster</span>
            <select
              value={effectiveRunnerToAddId}
              onChange={(event) => setRunnerToAddId(event.target.value)}
              disabled={nonRosteredRunners.length === 0}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {nonRosteredRunners.length === 0 ? (
                <option value="">All runners already rostered</option>
              ) : (
                nonRosteredRunners.map((runner) => (
                  <option key={runner.id} value={runner.id}>
                    {runner.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <Button
            type="button"
            className="h-10 self-end"
            onClick={handleAddRunnerToMeet}
            disabled={!effectiveRunnerToAddId || nonRosteredRunners.length === 0}
          >
            Add To Meet
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_120px_auto]">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">3. Assign Rostered Runner</span>
            <select
              value={effectiveAssignmentRunnerId}
              onChange={(event) => setAssignmentRunnerId(event.target.value)}
              disabled={rosteredRunners.length === 0}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rosteredRunners.length === 0 ? (
                <option value="">No rostered runners</option>
              ) : (
                rosteredRunners.map((runner) => (
                  <option key={runner.id} value={runner.id}>
                    {runner.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Race</span>
            <select
              value={effectiveAssignmentRaceId}
              onChange={(event) => setAssignmentRaceId(event.target.value)}
              disabled={races.length === 0}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {races.length === 0 ? (
                <option value="">No races available</option>
              ) : (
                races.map((race) => (
                  <option key={race.id} value={race.id}>
                    {race.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Heat</span>
            <input
              type="number"
              min={1}
              value={assignmentHeat}
              onChange={(event) => setAssignmentHeat(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </label>

          <Button
            type="button"
            className="h-10 self-end"
            onClick={handleAssignRunner}
            disabled={!effectiveAssignmentRunnerId || !effectiveAssignmentRaceId || rosteredRunners.length === 0}
          >
            Assign
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="space-y-3 rounded-xl border border-border/80 bg-background p-4">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Meet Roster</h3>
          {rosteredRunners.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add runners to this meet to build the roster.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {rosteredRunners.map((runner) => (
                <span key={runner.id} className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm">
                  {runner.name}
                </span>
              ))}
            </div>
          )}
        </article>

        <article className="space-y-3 rounded-xl border border-border/80 bg-background p-4">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Race Assignments</h3>
          {groupedAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Assign runners to a race and heat to populate this list.</p>
          ) : (
            <div className="grid gap-2">
              {groupedAssignments.map((group) => (
                <div key={`${group.raceName}-${group.heatNumber}`} className="rounded-lg border border-border/70 p-3">
                  <div className="text-sm font-semibold text-foreground">
                    {group.raceName} - Heat {group.heatNumber}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{group.runnerNames.join(', ')}</div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
