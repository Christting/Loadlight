import { demoWeekTasks } from './demo-data';
import { DEFAULT_WORKLOAD_WEEK_ANCHOR, workloadWeekRange } from './load-logic';
import type { StoredLoadLightState } from './types';

export const STORAGE_KEY = 'loadlight.prototype.v9';
const LEGACY_STORAGE_KEYS = ['loadlight.prototype.v1', 'loadlight.prototype.v2', 'loadlight.prototype.v3', 'loadlight.prototype.v4', 'loadlight.prototype.v5', 'loadlight.prototype.v6', 'loadlight.prototype.v7', 'loadlight.prototype.v8'];

const defaultWeek = workloadWeekRange(DEFAULT_WORKLOAD_WEEK_ANCHOR);

const defaultTasks = demoWeekTasks.map((task) => ({
  ...task,
  scheduledDate: task.scheduledDate ?? task.date ?? DEFAULT_WORKLOAD_WEEK_ANCHOR,
  weekStart: task.weekStart ?? defaultWeek.start,
  weekEnd: task.weekEnd ?? defaultWeek.end,
  status: 'not-started' as const,
}));

function normalizeTaskWeek<T extends { date?: string; scheduledDate?: string; weekStart?: string; weekEnd?: string }>(task: T): T {
  const scheduledDate = task.scheduledDate || task.date || DEFAULT_WORKLOAD_WEEK_ANCHOR;
  const week = workloadWeekRange(scheduledDate);
  return { ...task, scheduledDate, weekStart: week.start, weekEnd: week.end };
}

export const defaultStoredState: StoredLoadLightState = {
  isLoggedIn: false,
  email: 'mia@student.edu',
  journalEntries: [],
  taskDateOverrides: {},
  whatIfPlans: [],
  tasks: defaultTasks,
  planItems: [],
  loadLimit: 100,
};

export function loadStoredState(): StoredLoadLightState {
  if (typeof window === 'undefined') return defaultStoredState;
  try {
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStoredState;
    const parsed = JSON.parse(raw) as StoredLoadLightState;
    const whatIfPlans = parsed.whatIfPlans?.length ? parsed.whatIfPlans : parsed.whatIfPlan ? [parsed.whatIfPlan] : [];
    const tasks = (parsed.tasks?.length ? parsed.tasks : defaultStoredState.tasks)?.map(normalizeTaskWeek);
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
