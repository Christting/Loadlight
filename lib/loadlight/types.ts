export type AppView = 'home' | 'tasks' | 'what-if' | 'balance' | 'me';

export type Mood =
  | 'calm'
  | 'steady'
  | 'tired'
  | 'stressed'
  | 'overwhelmed'
  | 'recovering';

export type CheckInMood = Exclude<Mood, 'recovering'>;
export type Demand = 'low' | 'medium' | 'high';
export type TaskCategory = 'academic' | 'work' | 'social' | 'personal' | 'wellbeing' | 'other';
export type Flexibility = 'fixed' | 'flexible';
export type LoadDimension = 'mental' | 'time' | 'physical' | 'social' | 'errands';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'not-started' | 'in-progress' | 'done' | 'skipped';

export type FiveLoads = Record<LoadDimension, number>;

export interface StudentProfile {
  name: string;
  email: string;
  loadPointsPerWeightedHour: number;
}

export interface Task {
  id: string;
  title: string;
  date: string;
  timeLabel: string;
  durationHours: number;
  demand: Demand;
  category: TaskCategory;
  customCategory?: string;
  flexibility: Flexibility;
  loadMix: Partial<Record<LoadDimension, number>>;
  isProposed?: boolean;
  /** User override of the system-calculated Smart Priority. Undefined = use the calculated value. */
  priorityOverride?: TaskPriority;
  status?: TaskStatus;
  /** Optional — when the student actually plans to work on this, separate from the due date. */
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  /** True if this schedule was placed automatically by the system rather than chosen by the student. */
  autoScheduled?: boolean;
  /** Minutes before the scheduled start time to remind the student. Undefined = no reminder. */
  reminderMinutesBefore?: number;
}

export interface DayPlan {
  date: string;
  dayLabel: string;
  load: number;
  mood?: CheckInMood;
}

export interface JournalEntry {
  id: string;
  date: string;
  mood: CheckInMood;
  note: string;
  speechTranscript?: string;
  photoDataUrl?: string;
  reportedStress?: number;
}

export interface BalanceMove {
  taskId: string;
  title: string;
  fromDate: string;
  fromDayLabel: string;
  toDate: string;
  toDayLabel: string;
  reason: string;
  relocatedPoints: number;
}

export interface WhatIfPlan {
  id: string;
  title: string;
  dateLabel: string;
  durationHours: number;
  demand: Demand;
  category: TaskCategory;
  currentLoad?: number;
  projectedLoad: number;
  balancedLoad: number;
  adjustments?: Record<LoadDimension, number>;
  dominantDimension?: LoadDimension;
  statusLabel?: string;
  recommendation?: string;
  acceptedMoveIds: string[];
  savedAt: string;
}

export interface PlanItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
}

export interface StoredLoadLightState {
  isLoggedIn: boolean;
  email: string;
  journalEntries: JournalEntry[];
  selectedMood?: CheckInMood;
  taskDateOverrides: Record<string, string>;
  whatIfPlan?: WhatIfPlan;
  whatIfPlans?: WhatIfPlan[];
  tasks?: Task[];
  planItems?: PlanItem[];
}
