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
export type TaskCategory = 'academic' | 'work' | 'social' | 'errands' | 'personal';
export type Flexibility = 'fixed' | 'flexible';
export type LoadDimension = 'mental' | 'time' | 'physical' | 'social' | 'errands';

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
  flexibility: Flexibility;
  loadMix: Partial<Record<LoadDimension, number>>;
  isProposed?: boolean;
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
  toDate: string;
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

export interface StoredLoadLightState {
  isLoggedIn: boolean;
  email: string;
  journalEntries: JournalEntry[];
  selectedMood?: CheckInMood;
  whatIfPlan?: WhatIfPlan;
  whatIfPlans?: WhatIfPlan[];
}
