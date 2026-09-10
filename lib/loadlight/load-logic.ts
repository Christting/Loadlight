import { DEMO_DATES, profile, proposedCafeShift, thursdayTasks } from './demo-data';
import type { BalanceMove, Demand, PlanItem, Task, TaskPriority } from './types';

export const demandWeights: Record<Demand, number> = {
  low: 0.7,
  medium: 1,
  high: 1.3,
};

export function taskLoadPoints(task: Task): number {
  return Math.round(
    task.durationHours * demandWeights[task.demand] * profile.loadPointsPerWeightedHour,
  );
}

export function dailyTaskLoad(tasks: Task[]): number {
  return tasks.reduce((total, task) => total + taskLoadPoints(task), 0);
}

// Personal plan items don't have a demand rating, so they're weighted as
// "medium" — same scale as a task, just without a heavy/light distinction.
export function planItemDurationHours(item: PlanItem): number {
  if (!item.endTime) return 0;
  const [startHour, startMinute] = item.startTime.split(':').map(Number);
  const [endHour, endMinute] = item.endTime.split(':').map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return Math.max(minutes, 0) / 60;
}

export function planItemLoadPoints(item: PlanItem): number {
  return Math.round(planItemDurationHours(item) * demandWeights.medium * profile.loadPointsPerWeightedHour);
}

// Load points still "carried" — done/skipped tasks stop counting toward capacity.
export function activeTaskLoad(tasks: Task[]): number {
  return dailyTaskLoad(tasks.filter((task) => task.status !== 'done' && task.status !== 'skipped'));
}

// --- Smart Priority ---------------------------------------------------
// Priority = remaining work ÷ available time before the deadline.
// This is intentionally a starting rule, not a fixed law — tune the two
// constants below as the team learns more from testing.
export const ASSUMED_DAILY_CAPACITY_HOURS = 3; // how many hours/day a student can realistically work
const HIGH_THRESHOLD = 0.5;
const MEDIUM_THRESHOLD = 0.15;

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + 'T00:00:00');
  const to = new Date(toISO + 'T00:00:00');
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Calculates Smart Priority for a task: how urgent it is to work on *now*,
 * given how much is left to do and how much time is realistically left
 * before the deadline (after accounting for other tasks competing for
 * that same time).
 *
 * A task with no parseable deadline (`date`) defaults to 'low' — there's
 * nothing to calculate urgency against.
 */
export function computeSmartPriority(
  task: Task,
  allTasks: Task[],
  todayISO: string = new Date().toISOString().slice(0, 10),
): TaskPriority {
  if (task.priorityOverride) return task.priorityOverride;

  const daysUntilDue = task.date ? daysBetween(todayISO, task.date) : NaN;
  if (Number.isNaN(daysUntilDue)) return 'low';
  if (daysUntilDue <= 0) return 'high'; // due today or overdue

  const hoursCommittedByOthers = allTasks
    .filter(
      (other) =>
        other.id !== task.id &&
        other.status !== 'done' &&
        other.status !== 'skipped' &&
        other.date &&
        daysBetween(todayISO, other.date) > 0 &&
        daysBetween(todayISO, other.date) <= daysUntilDue,
    )
    .reduce((total, other) => total + other.durationHours, 0);

  const availableHours = Math.max(
    daysUntilDue * ASSUMED_DAILY_CAPACITY_HOURS - hoursCommittedByOthers,
    0.25, // floor to avoid divide-by-zero when the week is already packed solid
  );

  const score = task.durationHours / availableHours;
  if (score >= HIGH_THRESHOLD) return 'high';
  if (score >= MEDIUM_THRESHOLD) return 'medium';
  return 'low';
}

export function effectiveTaskDate(
  task: Task,
  taskDateOverrides: Record<string, string>,
): string {
  return taskDateOverrides[task.id] ?? task.date;
}

export const thursdayBeforeLoad = dailyTaskLoad(thursdayTasks);
export const proposedShiftLoad = taskLoadPoints(proposedCafeShift);
export const thursdayAfterWhatIf = thursdayBeforeLoad + proposedShiftLoad;

export const balanceMoves: BalanceMove[] = [
  {
    taskId: 'assignment-research',
    title: 'Move assignment research earlier',
    fromDate: DEMO_DATES.whatIfDay,
    fromDayLabel: 'Thursday',
    toDate: '2025-09-03',
    toDayLabel: 'Wednesday',
    reason: 'Research is flexible; the submission deadline remains unchanged.',
    relocatedPoints: taskLoadPoints(thursdayTasks.find((task) => task.id === 'assignment-research')!),
  },
  {
    taskId: 'team-call-prep',
    title: 'Prepare for the team call on Wednesday',
    fromDate: DEMO_DATES.whatIfDay,
    fromDayLabel: 'Thursday',
    toDate: '2025-09-03',
    toDayLabel: 'Wednesday',
    reason: 'Preparation can happen earlier without moving the fixed review.',
    relocatedPoints: taskLoadPoints(thursdayTasks.find((task) => task.id === 'team-call-prep')!),
  },
  {
    taskId: 'grocery-run',
    title: 'Group groceries with Friday’s library visit',
    fromDate: DEMO_DATES.whatIfDay,
    fromDayLabel: 'Thursday',
    toDate: '2025-09-05',
    toDayLabel: 'Friday',
    reason: 'The errand has no fixed deadline and can be grouped with an existing trip.',
    relocatedPoints: taskLoadPoints(thursdayTasks.find((task) => task.id === 'grocery-run')!),
  },
];

export const relocatedLoad = balanceMoves.reduce(
  (total, move) => total + move.relocatedPoints,
  0,
);

export const thursdayBalancedLoad = thursdayAfterWhatIf - relocatedLoad;

export function demoMathIsConsistent(): boolean {
  return (
    thursdayBeforeLoad === 83 &&
    proposedShiftLoad === 21 &&
    thursdayAfterWhatIf === 104 &&
    relocatedLoad === 21 &&
    thursdayBalancedLoad === 83
  );
}

if (!demoMathIsConsistent()) {
  throw new Error('LoadLight demo data must remain 83 → 104 → 83.');
}
