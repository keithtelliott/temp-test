import { useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { addRunner } from '@/features/runners/runnersSlice';

export function RunnersPanel() {
  const [runnerName, setRunnerName] = useState('');
  const dispatch = useAppDispatch();
  const runners = useAppSelector((state) => state.runners.items);

  function submitRunner() {
    dispatch(addRunner(runnerName));
    setRunnerName('');
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      submitRunner();
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-card-foreground">Runners</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add runner names to build your roster. This list persists locally in your browser.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-border/80 bg-muted/20 p-4 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          value={runnerName}
          onChange={(event) => setRunnerName(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Enter runner name"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <Button type="button" className="h-10" onClick={submitRunner}>
          Add Runner
        </Button>
      </div>

      {runners.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
          Add a runner above to build the roster.
        </p>
      ) : (
        <div className="grid gap-2">
          {runners.map((runner) => (
            <div
              key={runner.id}
              className="rounded-lg border border-border/70 bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm"
            >
              {runner.name}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
