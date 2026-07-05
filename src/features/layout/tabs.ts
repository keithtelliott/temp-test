import type { TabId } from '@/shared/types/domain';

export interface TabDefinition {
  id: TabId;
  label: string;
}

export const TAB_DEFINITIONS: TabDefinition[] = [
  { id: 'runners', label: 'Runners' },
  { id: 'races', label: 'Races' },
  { id: 'meets', label: 'Meets' },
  { id: 'meet-setup', label: 'Meet Setup' },
  { id: 'timer', label: 'Timer' },
  { id: 'results', label: 'Results' },
];
