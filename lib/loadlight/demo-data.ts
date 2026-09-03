import type { DayPlan, FiveLoads, StudentProfile, Task } from './types';

export const DEMO_DATES = {
  today: '2025-09-02',
  whatIfDay: '2025-09-04',
} as const;

export const profile: StudentProfile = {
  name: 'Mia',
  email: 'mia@student.edu',
  loadPointsPerWeightedHour: 5.25,
};

export const todayFiveLoads: FiveLoads = {
  mental: 86,
  time: 78,
  physical: 42,
  social: 54,
  errands: 61,
};

export const weekPlan: DayPlan[] = [
  { date: '2025-09-01', dayLabel: 'Mon', load: 61, mood: 'calm' },
  { date: DEMO_DATES.today, dayLabel: 'Tue', load: 78, mood: 'steady' },
  { date: '2025-09-03', dayLabel: 'Wed', load: 81, mood: 'tired' },
  { date: DEMO_DATES.whatIfDay, dayLabel: 'Thu', load: 83, mood: 'stressed' },
  { date: '2025-09-05', dayLabel: 'Fri', load: 60 },
  { date: '2025-09-06', dayLabel: 'Sat', load: 54 },
  { date: '2025-09-07', dayLabel: 'Sun', load: 38 },
];

// The fixed date labels shown in the prototype follow the approved demo story,
// rather than the viewer's current system clock.
export const timelineLabels = {
  today: 'Tuesday, 2 September',
  whatIfDay: 'Thursday, 4 September',
};

export const thursdayTasks: Task[] = [
  {
    id: 'ds-final-writing',
    title: 'Data Structures final writing',
    date: DEMO_DATES.whatIfDay,
    timeLabel: '9:00 AM',
    durationHours: 5,
    demand: 'high',
    category: 'academic',
    flexibility: 'fixed',
    loadMix: { mental: 0.7, time: 0.3 },
  },
  {
    id: 'prototype-review',
    title: 'Prototype review',
    date: DEMO_DATES.whatIfDay,
    timeLabel: '2:00 PM',
    durationHours: 4.1,
    demand: 'high',
    category: 'academic',
    flexibility: 'fixed',
    loadMix: { mental: 0.55, social: 0.3, time: 0.15 },
  },
  {
    id: 'assignment-research',
    title: 'Assignment research',
    date: DEMO_DATES.whatIfDay,
    timeLabel: 'Flexible',
    durationHours: 1.5,
    demand: 'medium',
    category: 'academic',
    flexibility: 'flexible',
    loadMix: { mental: 0.75, time: 0.25 },
  },
  {
    id: 'team-call-prep',
    title: 'Team call preparation',
    date: DEMO_DATES.whatIfDay,
    timeLabel: 'Flexible',
    durationHours: 1.5,
    demand: 'medium',
    category: 'social',
    flexibility: 'flexible',
    loadMix: { mental: 0.35, social: 0.45, time: 0.2 },
  },
  {
    id: 'grocery-run',
    title: 'Grocery run',
    date: DEMO_DATES.whatIfDay,
    timeLabel: 'Flexible',
    durationHours: 1.35,
    demand: 'low',
    category: 'errands',
    flexibility: 'flexible',
    loadMix: { errands: 0.65, physical: 0.2, time: 0.15 },
  },
];

export const proposedCafeShift: Task = {
  id: 'extra-cafe-shift',
  title: 'Extra café shift',
  date: DEMO_DATES.whatIfDay,
  timeLabel: '6:00 PM',
  durationHours: 4,
  demand: 'medium',
  category: 'work',
  flexibility: 'fixed',
  isProposed: true,
  loadMix: { time: 0.45, physical: 0.35, social: 0.2 },
};
