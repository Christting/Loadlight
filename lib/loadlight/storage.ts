import { thursdayTasks } from './demo-data';
import type { StoredLoadLightState } from './types';

export const STORAGE_KEY = 'loadlight.prototype.v1';

const defaultTasks = thursdayTasks.map((task) => ({
  ...task,
  status: 'not-started' as const,
}));

export const defaultStoredState: StoredLoadLightState = {
  isLoggedIn: false,
  email: 'mia@student.edu',
  journalEntries: [],
  taskDateOverrides: {},
  whatIfPlans: [],
  tasks: defaultTasks,
  planItems: [],
};

export function loadStoredState(): StoredLoadLightState {
  if (typeof window === 'undefined') return defaultStoredState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStoredState;
    const parsed = JSON.parse(raw) as StoredLoadLightState;
    const whatIfPlans = parsed.whatIfPlans?.length ? parsed.whatIfPlans : parsed.whatIfPlan ? [parsed.whatIfPlan] : [];
    const tasks = parsed.tasks?.length ? parsed.tasks : defaultStoredState.tasks;
    const planItems = parsed.planItems ?? [];
    return { ...defaultStoredState, ...parsed, isLoggedIn: false, whatIfPlan: whatIfPlans[0], whatIfPlans, tasks, planItems };
  } catch {
    return defaultStoredState;
  }
}

export function saveStoredState(state: StoredLoadLightState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
