import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setActiveMeet } from '@/features/meets/meetsSlice';
import { setActiveRace } from '@/features/races/racesSlice';
import { appendResult } from '@/features/results/resultsSlice';

interface LapRecord {
  number: number;
  lapTime: number;
  totalTime: number;
}

interface RunnerRuntimeState {
  laps: LapRecord[];
  finished: boolean;
  finishTime: number | null;
}

const timerHeats = [1, 2];

function formatTime(milliseconds: number): string {
  const totalSeconds = milliseconds / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((milliseconds % 1000) / 10);

  return (
    String(minutes).padStart(2, '0') +
    ':' +
    String(seconds).padStart(2, '0') +
    '.' +
    String(hundredths).padStart(2, '0')
  );
}

function createResultSessionId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toRaceHeatKey(raceId: string, heatNumber: number): string {
  return `${raceId}::${heatNumber}`;
}

function parseRaceHeatKey(value: string): { raceId: string; heatNumber: number } | null {
  const [raceId, heatValue] = value.split('::');
  const heatNumber = Number.parseInt(heatValue, 10);

  if (!raceId || !Number.isInteger(heatNumber)) {
    return null;
  }

  return { raceId, heatNumber };
}

export function TimerPanel() {
  const dispatch = useAppDispatch();
  const meets = useAppSelector((state) => state.meets.items);
  const activeMeetId = useAppSelector((state) => state.meets.activeMeetId);
  const races = useAppSelector((state) => state.races.items);
  const activeRaceId = useAppSelector((state) => state.races.activeRaceId);
  const runners = useAppSelector((state) => state.runners.items);

  const activeMeet = useMemo(() => meets.find((meet) => meet.id === activeMeetId) ?? null, [activeMeetId, meets]);

  const timerOptions = useMemo(() => {
    if (!activeMeet) {
      return [];
    }

    const assignmentMap = new Map<string, { value: string; raceId: string; heatNumber: number; label: string }>();

    activeMeet.assignments.forEach((assignment) => {
      const race = races.find((entry) => entry.id === assignment.raceId);

      if (!race) {
        return;
      }

      const value = toRaceHeatKey(race.id, assignment.heatNumber);

      assignmentMap.set(value, {
        value,
        raceId: race.id,
        heatNumber: assignment.heatNumber,
        label: `${race.name} Heat ${assignment.heatNumber}`,
      });
    });

    const assignmentOptions = Array.from(assignmentMap.values());

    if (assignmentOptions.length > 0) {
      return assignmentOptions;
    }

    return races.flatMap((race) =>
      timerHeats.map((heatNumber) => ({
        value: toRaceHeatKey(race.id, heatNumber),
        raceId: race.id,
        heatNumber,
        label: `${race.name} Heat ${heatNumber}`,
      })),
    );
  }, [activeMeet, races]);

  const [activeHeatNumber, setActiveHeatNumber] = useState(1);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [runnerStateById, setRunnerStateById] = useState<Record<number, RunnerRuntimeState>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const fallbackRaceHeat = timerOptions[0] ?? null;
  const hasCurrentSelection = timerOptions.some(
    (option) => option.raceId === activeRaceId && option.heatNumber === activeHeatNumber,
  );

  const selectedRaceId = hasCurrentSelection
    ? activeRaceId
    : fallbackRaceHeat
      ? fallbackRaceHeat.raceId
      : activeRaceId;

  const selectedHeatNumber = hasCurrentSelection
    ? activeHeatNumber
    : fallbackRaceHeat
      ? fallbackRaceHeat.heatNumber
      : activeHeatNumber;

  useEffect(() => {
    if (!isRunning || startTime === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 10);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRunning, startTime]);

  const runnersForActiveHeat = useMemo(() => {
    if (!activeMeet) {
      return [];
    }

    const runnerIds = new Set(
      activeMeet.assignments
        .filter((assignment) => assignment.raceId === selectedRaceId && assignment.heatNumber === selectedHeatNumber)
        .map((assignment) => assignment.runnerId),
    );

    return runners.filter((runner) => runnerIds.has(runner.id));
  }, [activeMeet, runners, selectedRaceId, selectedHeatNumber]);

  function ensureSessionId(): string {
    if (currentSessionId) {
      return currentSessionId;
    }

    const nextSessionId = createResultSessionId();
    setCurrentSessionId(nextSessionId);
    return nextSessionId;
  }

  function startTimer() {
    if (timerOptions.length === 0 || isRunning) {
      return;
    }

    if (startTime === null && elapsedTime === 0) {
      setCurrentSessionId(createResultSessionId());
    }

    setStartTime(Date.now() - elapsedTime);
    setIsRunning(true);
  }

  function stopTimer() {
    if (!isRunning) {
      return;
    }

    setIsRunning(false);
  }

  function resetTimer() {
    stopTimer();
    setStartTime(null);
    setCurrentSessionId(null);
    setElapsedTime(0);
    setRunnerStateById({});
  }

  function recordLap(runnerId: number) {
    if (!isRunning) {
      return;
    }

    const runner = runners.find((entry) => entry.id === runnerId);

    if (!runner) {
      return;
    }

    const runtimeState = runnerStateById[runnerId] ?? { laps: [], finished: false, finishTime: null };

    if (runtimeState.finished) {
      return;
    }

    const previousTotal = runtimeState.laps.length > 0 ? runtimeState.laps[runtimeState.laps.length - 1].totalTime : 0;
    const lapTime = elapsedTime - previousTotal;

    if (lapTime <= 0) {
      return;
    }

    const nextLap = {
      number: runtimeState.laps.length + 1,
      lapTime,
      totalTime: elapsedTime,
    };

    setRunnerStateById((current) => ({
      ...current,
      [runnerId]: {
        ...runtimeState,
        laps: [...runtimeState.laps, nextLap],
      },
    }));

    dispatch(
      appendResult({
        id: `${new Date().toISOString()}-${runnerId}-${nextLap.number}`,
        meetId: activeMeetId,
        raceId: selectedRaceId,
        heatNumber: selectedHeatNumber,
        sessionId: ensureSessionId(),
        runnerId,
        runnerName: runner.name,
        lapNumber: nextLap.number,
        lapTime: nextLap.lapTime,
        totalTime: nextLap.totalTime,
        recordedAt: new Date().toISOString(),
        isFinishLap: false,
      }),
    );
  }

  function finishRunner(runnerId: number) {
    if (!isRunning) {
      return;
    }

    const runner = runners.find((entry) => entry.id === runnerId);

    if (!runner) {
      return;
    }

    const runtimeState = runnerStateById[runnerId] ?? { laps: [], finished: false, finishTime: null };

    if (runtimeState.finished) {
      return;
    }

    const previousTotal = runtimeState.laps.length > 0 ? runtimeState.laps[runtimeState.laps.length - 1].totalTime : 0;
    const hasUnrecordedTime = elapsedTime > previousTotal;

    let nextState = runtimeState;

    if (hasUnrecordedTime) {
      const nextLap = {
        number: runtimeState.laps.length + 1,
        lapTime: elapsedTime - previousTotal,
        totalTime: elapsedTime,
      };

      dispatch(
        appendResult({
          id: `${new Date().toISOString()}-${runnerId}-${nextLap.number}`,
          meetId: activeMeetId,
          raceId: selectedRaceId,
          heatNumber: selectedHeatNumber,
          sessionId: ensureSessionId(),
          runnerId,
          runnerName: runner.name,
          lapNumber: nextLap.number,
          lapTime: nextLap.lapTime,
          totalTime: nextLap.totalTime,
          recordedAt: new Date().toISOString(),
          isFinishLap: true,
        }),
      );

      nextState = {
        ...runtimeState,
        laps: [...runtimeState.laps, nextLap],
      };
    }

    setRunnerStateById((current) => ({
      ...current,
      [runnerId]: {
        ...nextState,
        finished: true,
        finishTime: elapsedTime,
      },
    }));

    const remainingRunners = runnersForActiveHeat.some((entry) => {
      if (entry.id === runnerId) {
        return false;
      }

      return !(runnerStateById[entry.id]?.finished ?? false);
    });

    if (!remainingRunners) {
      stopTimer();
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-card-foreground">Timer</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a meet and race heat, start the clock, then record lap and finish taps per runner.
        </p>
      </div>

      <div className="rounded-xl border border-border/80 bg-background px-6 py-5 text-center">
        <div className="text-4xl font-semibold tracking-tight text-card-foreground">{formatTime(elapsedTime)}</div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
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

        <select
          value={toRaceHeatKey(selectedRaceId, selectedHeatNumber)}
          onChange={(event) => {
            const parsed = parseRaceHeatKey(event.target.value);

            if (!parsed) {
              return;
            }

            dispatch(setActiveRace(parsed.raceId));
            setActiveHeatNumber(parsed.heatNumber);
          }}
          disabled={timerOptions.length === 0}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {timerOptions.length === 0 ? (
            <option value="">No races available</option>
          ) : (
            timerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={startTimer} disabled={timerOptions.length === 0 || isRunning}>
            Start Race
          </Button>
          <Button type="button" variant="outline" onClick={stopTimer} disabled={!isRunning}>
            Stop
          </Button>
          <Button type="button" variant="destructive" onClick={resetTimer}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {runnersForActiveHeat.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
            No runners are assigned to this meet and race heat yet.
          </p>
        ) : (
          runnersForActiveHeat.map((runner) => {
            const runtimeState = runnerStateById[runner.id] ?? { laps: [], finished: false, finishTime: null };
            const latestLap = runtimeState.laps[runtimeState.laps.length - 1] ?? null;

            return (
              <article
                key={runner.id}
                className="rounded-xl border border-border/80 bg-background p-4 shadow-sm transition data-[finished=true]:opacity-70"
                data-finished={runtimeState.finished}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-card-foreground">{runner.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Lap {latestLap ? latestLap.number : 0} · Last {latestLap ? formatTime(latestLap.lapTime) : '--:--.--'}
                      {' · '}Total {latestLap ? formatTime(latestLap.totalTime) : '--:--.--'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => recordLap(runner.id)} disabled={!isRunning || runtimeState.finished}>
                      Lap
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => finishRunner(runner.id)}
                      disabled={!isRunning || runtimeState.finished}
                    >
                      {runtimeState.finished ? 'Finished' : 'Finish'}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
