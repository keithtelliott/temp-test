import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { clearResultsByIds } from '@/features/results/resultsSlice';

const ALL_RACES_OPTION = '__all_races__';
const ALL_HEATS_OPTION = '__all_heats__';
const ALL_SESSIONS_OPTION = '__all_sessions__';
const LATEST_SESSION_OPTION = '__latest_session__';

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

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value ?? '');

  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function toScopeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function ResultsPanel() {
  const dispatch = useAppDispatch();
  const meets = useAppSelector((state) => state.meets.items);
  const races = useAppSelector((state) => state.races.items);
  const activeMeetId = useAppSelector((state) => state.meets.activeMeetId);
  const results = useAppSelector((state) => state.results.items);

  const [meetFilterValue, setMeetFilterValue] = useState(activeMeetId);
  const [raceFilterValue, setRaceFilterValue] = useState(ALL_RACES_OPTION);
  const [heatFilterValue, setHeatFilterValue] = useState(ALL_HEATS_OPTION);
  const [sessionFilterValue, setSessionFilterValue] = useState(LATEST_SESSION_OPTION);
  const [actionMessage, setActionMessage] = useState('');

  const effectiveMeetId =
    meets.some((meet) => meet.id === meetFilterValue)
      ? meetFilterValue
      : meets.some((meet) => meet.id === activeMeetId)
        ? activeMeetId
        : meets[0]
          ? meets[0].id
          : '';

  const getMeetNameById = useCallback(
    (meetId: string): string => {
      const meet = meets.find((entry) => entry.id === meetId);
      return meet ? meet.name : 'Unknown Meet';
    },
    [meets],
  );

  const getRaceNameById = useCallback(
    (raceId: string): string => {
      const race = races.find((entry) => entry.id === raceId);
      return race ? race.name : 'Unknown Race';
    },
    [races],
  );

  const scopedRaceIds = useMemo(() => {
    const raceIds = new Set(
      results
        .filter((entry) => !effectiveMeetId || entry.meetId === effectiveMeetId)
        .map((entry) => entry.raceId),
    );

    races.forEach((race) => raceIds.add(race.id));

    return Array.from(raceIds).sort((a, b) => getRaceNameById(a).localeCompare(getRaceNameById(b)));
  }, [effectiveMeetId, getRaceNameById, races, results]);

  const effectiveRaceFilterValue =
    raceFilterValue === ALL_RACES_OPTION || scopedRaceIds.includes(raceFilterValue) ? raceFilterValue : ALL_RACES_OPTION;

  const scopedHeats = useMemo(() => {
    return Array.from(
      new Set(
        results
          .filter((entry) => {
            const matchesMeet = !effectiveMeetId || entry.meetId === effectiveMeetId;
            const matchesRace = effectiveRaceFilterValue === ALL_RACES_OPTION || entry.raceId === effectiveRaceFilterValue;
            return matchesMeet && matchesRace;
          })
          .map((entry) => entry.heatNumber),
      ),
    ).sort((a, b) => a - b);
  }, [effectiveMeetId, effectiveRaceFilterValue, results]);

  const effectiveHeatFilterValue =
    heatFilterValue === ALL_HEATS_OPTION || scopedHeats.includes(Number.parseInt(heatFilterValue, 10))
      ? heatFilterValue
      : ALL_HEATS_OPTION;

  const scopedResultsWithoutSessionFilter = useMemo(() => {
    return results.filter((entry) => {
      const matchesMeet = !effectiveMeetId || entry.meetId === effectiveMeetId;
      const matchesRace = effectiveRaceFilterValue === ALL_RACES_OPTION || entry.raceId === effectiveRaceFilterValue;
      const matchesHeat =
        effectiveHeatFilterValue === ALL_HEATS_OPTION || entry.heatNumber === Number.parseInt(effectiveHeatFilterValue, 10);

      return matchesMeet && matchesRace && matchesHeat;
    });
  }, [effectiveHeatFilterValue, effectiveMeetId, effectiveRaceFilterValue, results]);

  const latestSessionId = useMemo(() => {
    if (scopedResultsWithoutSessionFilter.length === 0) {
      return null;
    }

    const latestEntry = scopedResultsWithoutSessionFilter.reduce((latest, entry) => {
      if (!latest) {
        return entry;
      }

      return new Date(entry.recordedAt).getTime() > new Date(latest.recordedAt).getTime() ? entry : latest;
    }, scopedResultsWithoutSessionFilter[0] ?? null);

    return latestEntry ? latestEntry.sessionId : null;
  }, [scopedResultsWithoutSessionFilter]);

  const sortedSessionIds = useMemo(() => {
    const sessionMap = new Map<string, number>();

    scopedResultsWithoutSessionFilter.forEach((entry) => {
      const timestamp = new Date(entry.recordedAt).getTime();
      const current = sessionMap.get(entry.sessionId) ?? 0;
      sessionMap.set(entry.sessionId, Math.max(current, timestamp));
    });

    return Array.from(sessionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([sessionId]) => sessionId);
  }, [scopedResultsWithoutSessionFilter]);

  const effectiveSessionFilterValue =
    sessionFilterValue === LATEST_SESSION_OPTION ||
    sessionFilterValue === ALL_SESSIONS_OPTION ||
    sortedSessionIds.includes(sessionFilterValue)
      ? sessionFilterValue
      : LATEST_SESSION_OPTION;

  const filteredResults = useMemo(() => {
    return scopedResultsWithoutSessionFilter
      .filter((entry) => {
        if (effectiveSessionFilterValue === ALL_SESSIONS_OPTION) {
          return true;
        }

        if (effectiveSessionFilterValue === LATEST_SESSION_OPTION) {
          return latestSessionId !== null && entry.sessionId === latestSessionId;
        }

        return entry.sessionId === effectiveSessionFilterValue;
      })
      .sort((a, b) => {
        if (a.raceId !== b.raceId) {
          return getRaceNameById(a.raceId).localeCompare(getRaceNameById(b.raceId));
        }

        if (a.heatNumber !== b.heatNumber) {
          return a.heatNumber - b.heatNumber;
        }

        if (a.runnerName !== b.runnerName) {
          return a.runnerName.localeCompare(b.runnerName);
        }

        return a.lapNumber - b.lapNumber;
      });
  }, [effectiveSessionFilterValue, getRaceNameById, latestSessionId, scopedResultsWithoutSessionFilter]);

  const summary = useMemo(() => {
    if (filteredResults.length === 0) {
      return null;
    }

    const fastestLap = Math.min(...filteredResults.map((entry) => entry.lapTime));
    const averageLap = Math.round(filteredResults.reduce((sum, entry) => sum + entry.lapTime, 0) / filteredResults.length);

    const runnersWithLaps = new Set(filteredResults.map((entry) => entry.runnerId)).size;

    const fastestFinish = filteredResults
      .filter((entry) => entry.isFinishLap)
      .sort((a, b) => a.totalTime - b.totalTime)[0];

    return {
      runnersWithLaps,
      totalLaps: filteredResults.length,
      fastestLap,
      averageLap,
      fastestFinish,
    };
  }, [filteredResults]);

  const lapChart = useMemo(() => {
    if (filteredResults.length === 0) {
      return null;
    }

    const runnerGroups = new Map<number, { runnerId: number; runnerName: string; laps: typeof filteredResults }>();

    filteredResults.forEach((entry) => {
      if (!runnerGroups.has(entry.runnerId)) {
        runnerGroups.set(entry.runnerId, {
          runnerId: entry.runnerId,
          runnerName: entry.runnerName,
          laps: [],
        });
      }

      runnerGroups.get(entry.runnerId)?.laps.push(entry);
    });

    const maxLapTime = Math.max(...filteredResults.map((entry) => entry.lapTime));
    const ticks = [maxLapTime, maxLapTime * 0.75, maxLapTime * 0.5, maxLapTime * 0.25, 0];

    return {
      maxLapTime,
      ticks,
      runners: Array.from(runnerGroups.values()),
    };
  }, [filteredResults]);

  const groupedResults = useMemo(() => {
    const groups = new Map<string, Map<number, typeof filteredResults>>();

    filteredResults.forEach((entry) => {
      if (!groups.has(entry.raceId)) {
        groups.set(entry.raceId, new Map());
      }

      const heatMap = groups.get(entry.raceId);

      if (!heatMap) {
        return;
      }

      if (!heatMap.has(entry.heatNumber)) {
        heatMap.set(entry.heatNumber, []);
      }

      heatMap.get(entry.heatNumber)?.push(entry);
    });

    return Array.from(groups.entries())
      .sort((a, b) => getRaceNameById(a[0]).localeCompare(getRaceNameById(b[0])))
      .map(([raceId, heatMap]) => ({
        raceId,
        raceName: getRaceNameById(raceId),
        heats: Array.from(heatMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([heatNumber, entries]) => ({
            heatNumber,
            entries: entries
              .slice()
              .sort((a, b) => (a.runnerName === b.runnerName ? a.lapNumber - b.lapNumber : a.runnerName.localeCompare(b.runnerName))),
          })),
      }));
  }, [filteredResults, getRaceNameById]);

  function handleExportScopeCsv() {
    if (filteredResults.length === 0) {
      setActionMessage('No saved laps in this scope to export.');
      return;
    }

    const meetLabel = effectiveMeetId ? getMeetNameById(effectiveMeetId) : 'all-meets';
    const raceLabel =
      effectiveRaceFilterValue === ALL_RACES_OPTION ? 'all-races' : getRaceNameById(effectiveRaceFilterValue);
    const heatLabel =
      effectiveHeatFilterValue === ALL_HEATS_OPTION ? 'all-heats' : `heat-${effectiveHeatFilterValue}`;
    const runLabel =
      effectiveSessionFilterValue === LATEST_SESSION_OPTION
        ? 'latest-run'
        : effectiveSessionFilterValue === ALL_SESSIONS_OPTION
          ? 'all-runs'
          : 'selected-run';

    const header = ['meet', 'race', 'heat', 'runner', 'lap', 'lap_time', 'total_time', 'recorded_at'];
    const rows = filteredResults.map((entry) => [
      getMeetNameById(entry.meetId),
      getRaceNameById(entry.raceId),
      entry.heatNumber,
      entry.runnerName,
      entry.lapNumber,
      formatTime(entry.lapTime),
      formatTime(entry.totalTime),
      entry.recordedAt,
    ]);

    const csvLines = [header, ...rows].map((line) => line.map(escapeCsvValue).join(','));
    const csvBlob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `results-${toScopeLabel(`${meetLabel}-${raceLabel}-${heatLabel}-${runLabel}`)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setActionMessage(`Exported ${filteredResults.length} lap${filteredResults.length === 1 ? '' : 's'} for this scope.`);
  }

  function handleClearScope() {
    if (filteredResults.length === 0) {
      setActionMessage('No saved laps in this scope to clear.');
      return;
    }

    const meetLabel = effectiveMeetId ? getMeetNameById(effectiveMeetId) : 'All Meets';
    const raceLabel =
      effectiveRaceFilterValue === ALL_RACES_OPTION ? 'All Races' : getRaceNameById(effectiveRaceFilterValue);
    const heatLabel = effectiveHeatFilterValue === ALL_HEATS_OPTION ? 'All Heats' : `Heat ${effectiveHeatFilterValue}`;
    const runLabel =
      effectiveSessionFilterValue === LATEST_SESSION_OPTION
        ? 'Latest Run'
        : effectiveSessionFilterValue === ALL_SESSIONS_OPTION
          ? 'All Runs'
          : 'Selected Run';

    const confirmed = window.confirm(
      `Delete ${filteredResults.length} saved lap${filteredResults.length === 1 ? '' : 's'} for ${meetLabel} / ${raceLabel} / ${heatLabel} / ${runLabel}?`,
    );

    if (!confirmed) {
      setActionMessage('Clear cancelled.');
      return;
    }

    dispatch(clearResultsByIds(filteredResults.map((entry) => entry.id)));
    setActionMessage(`Cleared ${filteredResults.length} lap${filteredResults.length === 1 ? '' : 's'} from this scope.`);
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-card-foreground">Results</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review saved lap history by meet, then narrow by race, heat, and run session.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-foreground">Meet</span>
          <select
            value={effectiveMeetId}
            onChange={(event) => {
              setMeetFilterValue(event.target.value);
              setRaceFilterValue(ALL_RACES_OPTION);
              setHeatFilterValue(ALL_HEATS_OPTION);
              setSessionFilterValue(LATEST_SESSION_OPTION);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            {meets.map((meet) => (
              <option key={meet.id} value={meet.id}>
                {meet.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-foreground">Race</span>
          <select
            value={effectiveRaceFilterValue}
            onChange={(event) => {
              setRaceFilterValue(event.target.value);
              setHeatFilterValue(ALL_HEATS_OPTION);
              setSessionFilterValue(LATEST_SESSION_OPTION);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <option value={ALL_RACES_OPTION}>All Races</option>
            {scopedRaceIds.map((raceId) => (
              <option key={raceId} value={raceId}>
                {getRaceNameById(raceId)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-foreground">Heat</span>
          <select
            value={effectiveHeatFilterValue}
            onChange={(event) => {
              setHeatFilterValue(event.target.value);
              setSessionFilterValue(LATEST_SESSION_OPTION);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <option value={ALL_HEATS_OPTION}>All Heats</option>
            {scopedHeats.map((heatNumber) => (
              <option key={heatNumber} value={heatNumber}>
                Heat {heatNumber}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-foreground">Run</span>
          <select
            value={effectiveSessionFilterValue}
            onChange={(event) => setSessionFilterValue(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <option value={LATEST_SESSION_OPTION}>Latest Run</option>
            <option value={ALL_SESSIONS_OPTION}>All Runs</option>
            {sortedSessionIds.map((sessionId) => {
              const sessionEntry = scopedResultsWithoutSessionFilter.find((entry) => entry.sessionId === sessionId);
              const label = sessionEntry ? new Date(sessionEntry.recordedAt).toLocaleString() : sessionId;

              return (
                <option key={sessionId} value={sessionId}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>

        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" onClick={handleExportScopeCsv} disabled={filteredResults.length === 0}>
            Export Scope CSV
          </Button>
          <Button type="button" variant="destructive" onClick={handleClearScope} disabled={filteredResults.length === 0}>
            Clear Scope
          </Button>
        </div>
      </div>

      <p className="min-h-5 text-sm text-muted-foreground">{actionMessage}</p>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border/70 bg-muted/30 p-3 text-sm">
        <span className="rounded-full bg-background px-3 py-1">Meet: {effectiveMeetId ? getMeetNameById(effectiveMeetId) : 'None'}</span>
        <span className="rounded-full bg-background px-3 py-1">
          Race: {effectiveRaceFilterValue === ALL_RACES_OPTION ? 'All Races' : getRaceNameById(effectiveRaceFilterValue)}
        </span>
        <span className="rounded-full bg-background px-3 py-1">
          Heat: {effectiveHeatFilterValue === ALL_HEATS_OPTION ? 'All Heats' : `Heat ${effectiveHeatFilterValue}`}
        </span>
        <span className="rounded-full bg-background px-3 py-1">
          Run:{' '}
          {effectiveSessionFilterValue === LATEST_SESSION_OPTION
            ? 'Latest Run'
            : effectiveSessionFilterValue === ALL_SESSIONS_OPTION
              ? 'All Runs'
              : 'Selected Run'}
        </span>
        <span className="rounded-full bg-background px-3 py-1">Laps: {filteredResults.length}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-border/70 bg-background p-4">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Scope Statistics</h3>
          {!summary ? (
            <p className="text-sm text-muted-foreground">No saved laps in this scope yet.</p>
          ) : (
            <div className="grid gap-1 text-sm">
              <p>Runners with Laps: {summary.runnersWithLaps}</p>
              <p>Total Laps: {summary.totalLaps}</p>
              <p>Fastest Lap: {formatTime(summary.fastestLap)}</p>
              <p>Average Lap: {formatTime(summary.averageLap)}</p>
              <p>
                Fastest Finish:{' '}
                {summary.fastestFinish
                  ? `${summary.fastestFinish.runnerName} (${formatTime(summary.fastestFinish.totalTime)})`
                  : 'No finished runners in this scope.'}
              </p>
            </div>
          )}
        </article>

        <article className="rounded-xl border border-border/70 bg-background p-4">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Lap Time Chart</h3>
          {!lapChart ? (
            <p className="text-sm text-muted-foreground">No lap data to chart in this scope.</p>
          ) : (
            <div className="grid min-h-[260px] grid-cols-[64px_1fr] gap-4 items-end max-[840px]:grid-cols-1">
              <div className="flex min-h-[220px] flex-col justify-between text-xs text-muted-foreground">
                {lapChart.ticks.map((tick, index) => (
                  <div key={`${tick}-${index}`} className="pr-2 text-right">
                    {formatTime(Math.round(tick))}
                  </div>
                ))}
              </div>

              <div className="relative flex h-[220px] items-end gap-4 overflow-x-auto">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border/50" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border/50" />
                {lapChart.runners.map((runner) => (
                  <div key={runner.runnerId} className="flex min-w-24 flex-1 flex-col items-center gap-2">
                    <div className="flex h-[130px] w-full items-end justify-center gap-1 border-l border-border/70 pl-2">
                      {runner.laps
                        .slice()
                        .sort((a, b) => a.lapNumber - b.lapNumber)
                        .map((lap) => {
                          const height = lapChart.maxLapTime > 0 ? Math.round((lap.lapTime / lapChart.maxLapTime) * 100) : 0;

                          return (
                            <div
                              key={lap.id}
                              title={`L${lap.lapNumber}: ${formatTime(lap.lapTime)}`}
                              style={{ height: `${height}%` }}
                              className="relative flex min-h-3 w-6 items-end justify-center rounded-t-md bg-blue-700 pb-1 text-[10px] text-white shadow"
                            >
                              <span className="absolute top-1 left-1 text-[10px] leading-none font-semibold">L{lap.lapNumber}</span>
                            </div>
                          );
                        })}
                    </div>
                    <div className="text-center text-xs font-semibold text-foreground">{runner.runnerName}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>

      <div className="grid gap-4">
        {groupedResults.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
            No saved laps for this meet/race/heat scope yet.
          </p>
        ) : (
          groupedResults.map((raceGroup) => (
            <article key={raceGroup.raceId} className="rounded-xl border border-border/70 bg-background p-4">
              <h3 className="mb-3 text-lg font-semibold text-card-foreground">{raceGroup.raceName}</h3>
              <div className="grid gap-3">
                {raceGroup.heats.map((heatGroup) => (
                  <section key={`${raceGroup.raceId}-${heatGroup.heatNumber}`} className="overflow-x-auto">
                    <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Heat {heatGroup.heatNumber}</h4>
                    <table className="min-w-full border border-border text-sm">
                      <thead className="bg-muted/40 text-left">
                        <tr>
                          <th className="border border-border px-3 py-2">Runner</th>
                          <th className="border border-border px-3 py-2">Lap</th>
                          <th className="border border-border px-3 py-2">Lap Time</th>
                          <th className="border border-border px-3 py-2">Total Time</th>
                          <th className="border border-border px-3 py-2">Recorded</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heatGroup.entries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="border border-border px-3 py-2">{entry.runnerName}</td>
                            <td className="border border-border px-3 py-2">
                              {entry.lapNumber}
                              {entry.isFinishLap ? ' (finish)' : ''}
                            </td>
                            <td className="border border-border px-3 py-2">{formatTime(entry.lapTime)}</td>
                            <td className="border border-border px-3 py-2">{formatTime(entry.totalTime)}</td>
                            <td className="border border-border px-3 py-2">{new Date(entry.recordedAt).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
