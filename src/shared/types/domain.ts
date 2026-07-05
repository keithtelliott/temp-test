export interface Runner {
  id: number;
  name: string;
  raceId: string | null;
  heatNumber: number | null;
}

export interface Race {
  id: string;
  name: string;
}

export interface RunnerAssignment {
  runnerId: number;
  raceId: string;
  heatNumber: number;
}

export interface Meet {
  id: string;
  name: string;
  roster: number[];
  assignments: RunnerAssignment[];
}

export interface ResultRecord {
  id: string;
  meetId: string;
  raceId: string;
  heatNumber: number;
  sessionId: string;
  runnerId: number;
  runnerName: string;
  lapNumber: number;
  lapTime: number;
  totalTime: number;
  recordedAt: string;
  isFinishLap: boolean;
}

export type TabId = 'runners' | 'races' | 'meets' | 'meet-setup' | 'timer' | 'results';
