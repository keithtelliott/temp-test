import { useMemo, useState, type ComponentType } from 'react';
import { Flag, ListChecks, MapPin, Timer, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/app/hooks';
import { TAB_DEFINITIONS } from '@/features/layout/tabs';
import { MeetsPanel } from '@/features/meets/MeetsPanel';
import { MeetSetupPanel } from '@/features/meets/MeetSetupPanel';
import { RacesPanel } from '@/features/races/RacesPanel';
import { ResultsPanel } from '@/features/results/ResultsPanel';
import { RunnersPanel } from '@/features/runners/RunnersPanel';
import { TimerPanel } from '@/features/timer/TimerPanel';
import type { TabId } from '@/shared/types/domain';

const tabIcons: Record<TabId, ComponentType<{ className?: string }>> = {
  runners: Users,
  races: Flag,
  meets: MapPin,
  'meet-setup': ListChecks,
  timer: Timer,
  results: Trophy,
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card px-4 py-3 shadow-sm">
      <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-card-foreground">{value}</div>
    </div>
  );
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('runners');

  const runnerCount = useAppSelector((state) => state.runners.items.length);
  const raceCount = useAppSelector((state) => state.races.items.length);
  const meetCount = useAppSelector((state) => state.meets.items.length);
  const resultCount = useAppSelector((state) => state.results.items.length);
  const activeMeetName = useAppSelector(
    (state) => state.meets.items.find((meet) => meet.id === state.meets.activeMeetId)?.name ?? 'No meet selected',
  );

  const activeTabLabel = useMemo(
    () => TAB_DEFINITIONS.find((tab) => tab.id === activeTab)?.label ?? 'Runners',
    [activeTab],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Lap Track</p>
            <h1 className="mt-2 text-3xl font-semibold text-card-foreground md:text-4xl">Migration Workspace</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              This React + TypeScript shell is now the primary implementation target. Legacy behavior remains available
              in the legacy folder for parity checks while features migrate.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Active meet: <span className="font-semibold text-foreground">{activeMeetName}</span>
          </div>
        </div>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Runners" value={runnerCount} />
        <StatCard label="Races" value={raceCount} />
        <StatCard label="Meets" value={meetCount} />
        <StatCard label="Saved Laps" value={resultCount} />
      </section>

      <section className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-border/80 bg-card p-2 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
        {TAB_DEFINITIONS.map((tab) => {
          const Icon = tabIcons[tab.id];
          const isActive = tab.id === activeTab;

          return (
            <Button
              key={tab.id}
              type="button"
              variant={isActive ? 'default' : 'outline'}
              className="h-14 justify-start gap-2 text-left"
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </Button>
          );
        })}
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        {activeTab === 'runners' && <RunnersPanel />}
        {activeTab === 'races' && <RacesPanel />}
        {activeTab === 'meets' && <MeetsPanel />}
        {activeTab === 'meet-setup' && <MeetSetupPanel />}
        {activeTab === 'timer' && <TimerPanel />}
        {activeTab === 'results' && <ResultsPanel />}
        {activeTab !== 'runners' &&
          activeTab !== 'races' &&
          activeTab !== 'meets' &&
          activeTab !== 'meet-setup' &&
          activeTab !== 'timer' &&
          activeTab !== 'results' && (
          <>
            <h2 className="text-xl font-semibold text-card-foreground">{activeTabLabel}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The {activeTabLabel} module is queued for parity migration from the legacy app. Runners, races, and
              meet setup workflows are now active with Redux and local persistence.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
