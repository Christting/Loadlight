import { profile, proposedCafeShift, thursdayTasks } from './demo-data';
import type { BalanceMove, Demand, Task } from './types';

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

export const thursdayBeforeLoad = dailyTaskLoad(thursdayTasks);
export const proposedShiftLoad = taskLoadPoints(proposedCafeShift);
export const thursdayAfterWhatIf = thursdayBeforeLoad + proposedShiftLoad;

export const balanceMoves: BalanceMove[] = [
  {
    taskId: 'assignment-research',
    title: 'Move assignment research earlier',
    fromDate: 'Thursday',
    toDate: 'Wednesday',
    reason: 'Research is flexible; the submission deadline remains unchanged.',
    relocatedPoints: taskLoadPoints(thursdayTasks.find((task) => task.id === 'assignment-research')!),
  },
  {
    taskId: 'team-call-prep',
    title: 'Prepare for the team call on Wednesday',
    fromDate: 'Thursday',
    toDate: 'Wednesday',
    reason: 'Preparation can happen earlier without moving the fixed review.',
    relocatedPoints: taskLoadPoints(thursdayTasks.find((task) => task.id === 'team-call-prep')!),
  },
  {
    taskId: 'grocery-run',
    title: 'Group groceries with Friday’s library visit',
    fromDate: 'Thursday',
    toDate: 'Friday',
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
