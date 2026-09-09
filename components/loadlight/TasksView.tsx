'use client';

import { useMemo, useState } from 'react';
import { Check, CheckCircle2, Circle, CircleDot, ListChecks, Pencil, Plus, Trash2, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Lumi } from '@/components/loadlight/Lumi';
import { activeTaskLoad, computeSmartPriority, planItemLoadPoints, taskLoadPoints } from '@/lib/loadlight/load-logic';
import type {
  Demand,
  Flexibility,
  PlanItem,
  StoredLoadLightState,
  Task,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from '@/lib/loadlight/types';

// --- Display config -----------------------------------------------------

const categoryOptions: { value: TaskCategory; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'work', label: 'Work' },
  { value: 'social', label: 'Social' },
  { value: 'personal', label: 'Personal & errands' },
  { value: 'wellbeing', label: 'Health & wellbeing' },
  { value: 'other', label: 'Other' },
];
type CategoryOption = { value: TaskCategory; label: string };
const categoryLookup = {} as Record<TaskCategory, CategoryOption>;
categoryOptions.forEach((option) => { categoryLookup[option.value] = option; });

function categoryMeta(task: Task) {
  return categoryLookup[task.category] ?? categoryLookup.other;
}

function categoryLabel(task: Task): string {
  if (task.category === 'other' && task.customCategory) return task.customCategory;
  return categoryMeta(task).label;
}

const durationQuickPicks = [0.5, 1, 2, 3, 4, 5];

const priorityLabels: Record<TaskPriority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

const statusLabels: Record<TaskStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  done: 'Completed',
  skipped: 'Skipped',
};

const reminderOptions = [
  { value: '', label: 'No reminder' },
  { value: '5', label: '5 minutes before' },
  { value: '10', label: '10 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
];

const DEFAULT_SUGGESTION_START = '19:00';
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// The real current week (Monday–Sunday) containing today — NOT a fixed demo
// week. This is what auto-placement and the Weekly Plan tabs are built on.
function getCurrentWeekDays(): { date: string; dayLabel: string; dayNumber: number }[] {
  const today = new Date();
  const jsDay = today.getDay(); // 0 = Sunday
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  return WEEKDAY_LABELS.map((label, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return { date: toISODate(d), dayLabel: label, dayNumber: d.getDate() };
  });
}

function weekdayLabelForISO(iso: string): string {
  const parsed = new Date(iso + 'T00:00:00');
  if (Number.isNaN(parsed.getTime())) return iso;
  const jsDay = parsed.getDay();
  return WEEKDAY_LABELS[jsDay === 0 ? 6 : jsDay - 1];
}

function formatTime12h(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function formatTimeRange(start: string, end?: string): string {
  return end ? `${formatTime12h(start)}–${formatTime12h(end)}` : formatTime12h(start);
}

function addHoursToTime(time: string, hours: number): string {
  const [hourStr, minuteStr] = time.split(':');
  const totalMinutes = Number(hourStr) * 60 + Number(minuteStr) + Math.round(hours * 60);
  const clamped = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));
  const hh = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// The status control only toggles between Not started <-> In progress.
// Completing a task is a deliberate separate action (the Complete button),
// only available once the task is In progress — the app never guesses.
function toggleInProgress(status: TaskStatus): TaskStatus {
  return status === 'in-progress' ? 'not-started' : 'in-progress';
}

function statusIcon(status: TaskStatus) {
  if (status === 'in-progress') return CircleDot;
  return Circle;
}

function loadStatusTone(load: number) {
  if (load > 100) return 'danger';
  if (load >= 85) return 'warning';
  return 'steady';
}

function newTaskId(title: string) {
  const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `task-${slug || 'item'}-${Date.now()}`;
}

function newPlanId(title: string) {
  const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `plan-${slug || 'item'}-${Date.now()}`;
}

// Demand still drives the load-points weighting (light/medium/heavy),
// derived automatically from the hours the student types in — no separate
// "how heavy does this feel" question, to keep the form short.
function demandFromHours(hours: number): Demand {
  if (hours <= 1) return 'low';
  if (hours <= 3) return 'medium';
  return 'high';
}

function todayHeaderLabel(): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
}

type WeekEntry = {
  key: string;
  startTime: string;
  endTime?: string;
  title: string;
  points: number;
  sourceLabel: string;
  kind: 'task' | 'plan';
  taskId?: string;
  planId?: string;
};

// --- Auto-placement -------------------------------------------------------
// Every task lands on its actual due date on the Weekly Plan the moment
// it's created. This is a placement, not a suggestion the system silently
// moves around — the student can reschedule it anytime from either the
// To-Do List or the Weekly Plan itself.
function computeAutoSchedule(
  task: { date: string; durationHours: number },
  existingTasks: Task[],
  existingPlanItems: PlanItem[],
  currentWeek: { date: string; dayLabel: string; dayNumber: number }[],
): { date: string; startTime: string; endTime: string } {
  const targetDate = task.date || currentWeek[0]?.date || '';

  const sameDayEnds = [
    ...existingTasks.filter((item) => item.scheduledDate === targetDate && item.endTime).map((item) => item.endTime as string),
    ...existingPlanItems.filter((item) => item.date === targetDate && item.endTime).map((item) => item.endTime as string),
  ].sort();
  const startTime = sameDayEnds.length > 0 && sameDayEnds[sameDayEnds.length - 1] > DEFAULT_SUGGESTION_START
    ? sameDayEnds[sameDayEnds.length - 1]
    : DEFAULT_SUGGESTION_START;

  return { date: targetDate, startTime, endTime: addHoursToTime(startTime, task.durationHours) };
}

// --- Component ------------------------------------------------------------

export function TasksView({ stored, onSave }: { stored: StoredLoadLightState; onSave: (next: StoredLoadLightState, message: string) => void }) {
  const tasks = stored.tasks ?? [];
  const planItems = stored.planItems ?? [];
  const currentWeek = useMemo(() => getCurrentWeekDays(), []);
  const [mode, setMode] = useState<'list' | 'week'>('list');
  const [formOpen, setFormOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('academic');
  const [customCategory, setCustomCategory] = useState('');
  const [hours, setHours] = useState('');
  const [flexibility, setFlexibility] = useState<Flexibility>('flexible');
  const [date, setDate] = useState('');

  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleReminder, setScheduleReminder] = useState('');

  const [planFormMode, setPlanFormMode] = useState<'closed' | 'add' | 'edit'>('closed');
  const [editingPlanItemId, setEditingPlanItemId] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState('');
  const [planStart, setPlanStart] = useState('');
  const [planEnd, setPlanEnd] = useState('');

  const load = useMemo(() => activeTaskLoad(tasks), [tasks]);
  const tone = loadStatusTone(load);

  const pendingTasks = tasks.filter((task) => task.status !== 'done' && task.status !== 'skipped');
  const closedTasks = tasks.filter((task) => task.status === 'done' || task.status === 'skipped');

  function resetForm() {
    setTitle('');
    setCategory('academic');
    setCustomCategory('');
    setHours('');
    setFlexibility('flexible');
    setDate('');
  }

  function addTask(event: React.FormEvent) {
    event.preventDefault();
    const parsedHours = Number(hours);
    if (!title.trim() || !parsedHours || parsedHours <= 0) return;

    const suggestion = computeAutoSchedule({ date, durationHours: parsedHours }, tasks, planItems, currentWeek);

    const task: Task = {
      id: newTaskId(title),
      title: title.trim(),
      date,
      timeLabel: 'Flexible',
      durationHours: parsedHours,
      demand: demandFromHours(parsedHours),
      category,
      customCategory: category === 'other' ? customCategory.trim() : undefined,
      flexibility,
      loadMix: {},
      status: 'not-started',
      scheduledDate: suggestion.date,
      startTime: suggestion.startTime,
      endTime: suggestion.endTime,
      autoScheduled: true,
    };
    onSave({ ...stored, tasks: [task, ...tasks] }, 'Task added.');
    resetForm();
    setFormOpen(false);
  }

  function toggleProgress(task: Task) {
    const updated = toggleInProgress(task.status ?? 'not-started');
    onSave(
      { ...stored, tasks: tasks.map((item) => (item.id === task.id ? { ...item, status: updated } : item)) },
      'Task updated.',
    );
  }

  function completeTask(task: Task) {
    onSave(
      { ...stored, tasks: tasks.map((item) => (item.id === task.id ? { ...item, status: 'done' } : item)) },
      'Nice — one less thing to carry.',
    );
  }

  function undoTask(task: Task) {
    onSave(
      { ...stored, tasks: tasks.map((item) => (item.id === task.id ? { ...item, status: 'in-progress' } : item)) },
      'Task moved back to your list.',
    );
  }

  function deleteTask(id: string) {
    onSave({ ...stored, tasks: tasks.filter((task) => task.id !== id) }, 'Task removed.');
  }

  function overridePriority(task: Task, value: TaskPriority | '') {
    onSave(
      { ...stored, tasks: tasks.map((item) => (item.id === task.id ? { ...item, priorityOverride: value || undefined } : item)) },
      'Priority updated.',
    );
  }

  function openSchedule(task: Task) {
    setSchedulingTaskId(task.id);
    setScheduleDate(task.scheduledDate ?? '');
    setScheduleStart(task.startTime ?? '');
    setScheduleEnd(task.endTime ?? '');
    setScheduleReminder(task.reminderMinutesBefore != null ? String(task.reminderMinutesBefore) : '');
  }

  function closeSchedule() {
    setSchedulingTaskId(null);
  }

  function saveSchedule(event: React.FormEvent, task: Task) {
    event.preventDefault();
    onSave(
      {
        ...stored,
        tasks: tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                scheduledDate: scheduleDate || undefined,
                startTime: scheduleStart || undefined,
                endTime: scheduleEnd || undefined,
                reminderMinutesBefore: scheduleReminder === '' ? undefined : Number(scheduleReminder),
                autoScheduled: false,
              }
            : item,
        ),
      },
      'Schedule saved.',
    );
    closeSchedule();
  }

  function clearSchedule(task: Task) {
    onSave(
      {
        ...stored,
        tasks: tasks.map((item) =>
          item.id === task.id
            ? { ...item, scheduledDate: undefined, startTime: undefined, endTime: undefined, reminderMinutesBefore: undefined, autoScheduled: false }
            : item,
        ),
      },
      'Schedule removed.',
    );
    closeSchedule();
  }

  function openAddPlan() {
    setPlanTitle('');
    setPlanStart('');
    setPlanEnd('');
    setEditingPlanItemId(null);
    setPlanFormMode('add');
  }

  function openEditPlan(item: PlanItem) {
    setPlanTitle(item.title);
    setPlanStart(item.startTime);
    setPlanEnd(item.endTime ?? '');
    setEditingPlanItemId(item.id);
    setPlanFormMode('edit');
  }

  function closePlanForm() {
    setPlanFormMode('closed');
    setEditingPlanItemId(null);
  }

  function submitPlanForm(event: React.FormEvent, forDate: string) {
    event.preventDefault();
    if (!planTitle.trim() || !planStart || !planEnd) return;

    if (planFormMode === 'edit' && editingPlanItemId) {
      onSave(
        {
          ...stored,
          planItems: planItems.map((item) =>
            item.id === editingPlanItemId
              ? { ...item, title: planTitle.trim(), startTime: planStart, endTime: planEnd || undefined }
              : item,
          ),
        },
        'Plan updated.',
      );
    } else {
      const item: PlanItem = {
        id: newPlanId(planTitle),
        title: planTitle.trim(),
        date: forDate,
        startTime: planStart,
        endTime: planEnd || undefined,
      };
      onSave({ ...stored, planItems: [...planItems, item] }, 'Added to plan.');
    }
    closePlanForm();
  }

  function deletePlanItem(id: string) {
    onSave({ ...stored, planItems: planItems.filter((item) => item.id !== id) }, 'Removed from plan.');
    if (editingPlanItemId === id) closePlanForm();
  }

  function renderScheduleEditor(task: Task) {
    const hasSchedule = Boolean(task.scheduledDate && task.startTime);
    const isScheduling = schedulingTaskId === task.id;

    if (isScheduling) {
      return (
        <form className="schedule-form" onSubmit={(event) => saveSchedule(event, task)}>
          <label>
            Date
            <Input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
          </label>
          <div className="schedule-form-times">
            <label>
              Start time
              <Input type="time" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} />
            </label>
            <label>
              End time
              <Input type="time" value={scheduleEnd} onChange={(event) => setScheduleEnd(event.target.value)} />
            </label>
          </div>
          <label>
            Reminder
            <NativeSelect value={scheduleReminder} onChange={(event) => setScheduleReminder(event.target.value)}>
              {reminderOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <div className="schedule-form-actions">
            <Button type="submit" className="primary-action">Save schedule</Button>
            <Button type="button" variant="outline" onClick={closeSchedule}>Cancel</Button>
            {hasSchedule && (
              <button type="button" className="text-action-btn" onClick={() => clearSchedule(task)}>
                Remove
              </button>
            )}
          </div>
        </form>
      );
    }

    if (hasSchedule) {
      return (
        <div className="schedule-display">
          <p className="schedule-line">📅 Planned: {weekdayLabelForISO(task.scheduledDate!)}, {formatTimeRange(task.startTime!, task.endTime)}</p>
          {task.reminderMinutesBefore != null && (
            <p className="schedule-line">🔔 Reminder: {task.reminderMinutesBefore} min before</p>
          )}
          <button type="button" className="edit-schedule-link" onClick={() => openSchedule(task)}>
            Reschedule
          </button>
        </div>
      );
    }

    return (
      <button type="button" className="schedule-chip add" onClick={() => openSchedule(task)}>
        + Schedule
      </button>
    );
  }

  function renderTaskRow(task: Task, closed: boolean) {
    const status = task.status ?? 'not-started';
    const StatusIcon = statusIcon(status);
    const appliedPriority = computeSmartPriority(task, tasks);

    return (
      <article className={`task-row${closed ? ' closed' : ''}`} key={task.id}>
        <div className="task-row-header">
          <strong className={closed ? 'done-text' : ''}>{task.title}</strong>
          {closed ? (
            <span className="status-toggle-btn static done">
              <CheckCircle2 /> {statusLabels.done}
            </span>
          ) : (
            <button type="button" className={`status-toggle-btn ${status}`} onClick={() => toggleProgress(task)}>
              <StatusIcon /> {statusLabels[status]}
            </button>
          )}
        </div>
        <div className="task-info">
          <p className="task-field"><span className="field-label">Category</span>{categoryLabel(task)}</p>
          <p className="task-field"><span className="field-label">Estimated time</span>{task.durationHours}h</p>
          <p className="task-field"><span className="field-label">Due date</span>{task.date || 'No date set'}</p>
          <p className="task-field"><span className="field-label">Workload</span>{taskLoadPoints(task)} points </p>
          {!closed && (
            <div className="task-priority-row">
              <span className={`priority-badge priority-${appliedPriority}`}>Priority: {priorityLabels[appliedPriority]}</span>
              <NativeSelect
                aria-label={`Change priority for ${task.title}`}
                value={task.priorityOverride ?? ''}
                onChange={(event) => overridePriority(task, event.target.value as TaskPriority | '')}
              >
                <NativeSelectOption value="">Use system priority</NativeSelectOption>
                <NativeSelectOption value="low">Low</NativeSelectOption>
                <NativeSelectOption value="medium">Medium</NativeSelectOption>
                <NativeSelectOption value="high">High</NativeSelectOption>
              </NativeSelect>
            </div>
          )}
          {!closed && renderScheduleEditor(task)}
        </div>
        <div className="task-actions">
          <button type="button" className="text-action-btn" onClick={() => deleteTask(task.id)}>
            <Trash2 /> Delete
          </button>
          {!closed && status === 'in-progress' && (
            <button type="button" className="text-action-btn complete-btn" onClick={() => completeTask(task)}>
              <Check /> Complete
            </button>
          )}
          {closed && (
            <>
              <span className="completed-label">Completed</span>
              <button type="button" className="text-action-btn" onClick={() => undoTask(task)}>
                <Undo2 /> Undo
              </button>
            </>
          )}
        </div>
      </article>
    );
  }

  // --- Weekly view: merges scheduled tasks + personal plan items, sorted by time ---
  const weekBuckets = currentWeek.map((day) => {
    const dayTasks = pendingTasks.filter((task) => task.scheduledDate === day.date && task.startTime);
    const dayPlanItems = planItems.filter((item) => item.date === day.date);
    const entries: WeekEntry[] = [
      ...dayTasks.map((task) => ({
        key: `task-${task.id}`,
        startTime: task.startTime!,
        endTime: task.endTime,
        title: task.title,
        points: taskLoadPoints(task),
        sourceLabel: `To-Do List task · ${taskLoadPoints(task)} pts`,
        kind: 'task' as const,
        taskId: task.id,
      })),
      ...dayPlanItems.map((item) => ({
        key: `plan-${item.id}`,
        startTime: item.startTime,
        endTime: item.endTime,
        title: item.title,
        points: planItemLoadPoints(item),
        sourceLabel: `Personal plan · ${planItemLoadPoints(item)} pts`,
        kind: 'plan' as const,
        planId: item.id,
      })),
    ].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const dayPoints = entries.reduce((total, entry) => total + entry.points, 0);
    return { ...day, entries, dayPoints };
  });
  const [activeDay, setActiveDay] = useState<string>(currentWeek[0]?.date ?? '');
  const activeDayBucket = weekBuckets.find((day) => day.date === activeDay);

  return (
    <div className="view-content tasks-view">
      <header className="page-header">
        <p className="date-label">TODAY · {todayHeaderLabel()}</p>
        <h1>Tasks</h1>
      </header>

      <section className="tasks-load-card" aria-label={`Current active load ${load} points`}>
        <Lumi state={tone === 'danger' ? 'overwhelmed' : tone === 'warning' ? 'tired' : 'steady'} size="small" />
        <div>
          <p className="micro-label">ACTIVE LOAD</p>
          <strong className={`load-figure ${tone}`}>{load} pts</strong>
          <p>
            {pendingTasks.length} task{pendingTasks.length === 1 ? '' : 's'} remaining
          </p>
        </div>
      </section>

      <div className="tasks-mode-toggle" role="tablist" aria-label="Task view">
        <button type="button" role="tab" aria-selected={mode === 'list'} className={mode === 'list' ? 'active' : ''} onClick={() => setMode('list')}>
          To-Do List
        </button>
        <button type="button" role="tab" aria-selected={mode === 'week'} className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>
          Weekly plan
        </button>
      </div>

      {mode === 'list' && (
        <section className="editorial-section" aria-labelledby="task-list-title">
          <div className="section-title">
            <div>
              <h2 id="task-list-title">What&apos;s on your list</h2>
            </div>
            <small>{pendingTasks.length} open</small>
          </div>

          {pendingTasks.length === 0 && <p className="empty-scenario-note">Nothing carried right now. Add a task below.</p>}

          <div className="task-list">{pendingTasks.map((task) => renderTaskRow(task, false))}</div>

          {!formOpen && (
            <Button type="button" className="primary-action add-task-button" onClick={() => setFormOpen(true)}>
              <Plus /> Add task
            </Button>
          )}

          {formOpen && (
            <form className="task-form" onSubmit={addTask}>
              <label>
                Title
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Finish lab report" autoFocus />
              </label>

              <fieldset className="task-form-fieldset">
                <legend>Which area does this affect?</legend>
                <div className="category-grid">
                  {categoryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`category-pill${category === option.value ? ' selected' : ''}`}
                      onClick={() => setCategory(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {category === 'other' && (
                  <Input
                    value={customCategory}
                    onChange={(event) => setCustomCategory(event.target.value)}
                    placeholder="Enter your category"
                    aria-label="Custom category"
                  />
                )}
              </fieldset>

              <fieldset className="task-form-fieldset">
                <legend>How much time will this take?</legend>
                <div className="duration-grid">
                  {durationQuickPicks.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`duration-pill${Number(hours) === value ? ' selected' : ''}`}
                      onClick={() => setHours(String(value))}
                    >
                      {value < 1 ? `${value * 60} min` : `${value} hr${value > 1 ? 's' : ''}`}
                    </button>
                  ))}
                </div>
                <label className="inline-number-label">
                  Or type your own estimate (hours)
                  <Input
                    type="number"
                    min="0"
                    step="0.25"
                    value={hours}
                    onChange={(event) => setHours(event.target.value)}
                    placeholder="e.g. 6.5"
                  />
                </label>
              </fieldset>

              <div className="task-form-grid">
                <fieldset className="task-form-fieldset">
                  <legend>Can this be rescheduled?</legend>
                  <div className="flex-radio-row">
                    <label>
                      <input type="radio" name="flexibility" checked={flexibility === 'flexible'} onChange={() => setFlexibility('flexible')} /> Flexible
                    </label>
                    <label>
                      <input type="radio" name="flexibility" checked={flexibility === 'fixed'} onChange={() => setFlexibility('fixed')} /> Fixed
                    </label>
                  </div>
                </fieldset>

                <label>
                  Deadline
                  <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </label>
              </div>

              <div className="task-form-actions">
                <Button type="submit" className="primary-action">
                  <Plus /> Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setFormOpen(false);
                  }}
                >
                  <X /> Cancel
                </Button>
              </div>
            </form>
          )}
        </section>
      )}

      {mode === 'week' && (
        <section className="editorial-section" aria-labelledby="week-title">
          <div className="section-title">
            <div>
              <h2 id="week-title">Weekly plan</h2>
            </div>
          </div>
          <div className="week-tabs" role="tablist" aria-label="Day of week">
            {weekBuckets.map((day) => (
              <button
                key={day.date}
                type="button"
                role="tab"
                aria-selected={activeDay === day.date}
                className={activeDay === day.date ? 'active' : ''}
                onClick={() => { setActiveDay(day.date); closePlanForm(); closeSchedule(); }}
              >
                <span className="week-tab-day">{day.dayLabel}</span>
                <span className="week-tab-date">{day.dayNumber}</span>
                <span className="week-tab-pts">{day.dayPoints} pts</span>
              </button>
            ))}
          </div>

          {activeDayBucket && (
            <>
              <div className="week-day-summary">
                <span>{activeDayBucket.dayLabel} {activeDayBucket.dayNumber}</span>
                <span>{activeDayBucket.dayPoints} pts carried</span>
              </div>
              <div className="week-entry-list">
                {activeDayBucket.entries.length === 0 ? (
                  <p className="empty-scenario-note">Nothing planned this day.</p>
                ) : (
                  activeDayBucket.entries.map((entry) => {
                    const entryTask = entry.kind === 'task' ? tasks.find((task) => task.id === entry.taskId) : undefined;
                    const entryPlan = entry.kind === 'plan' ? planItems.find((item) => item.id === entry.planId) : undefined;
                    return (
                      <div className="week-entry" key={entry.key}>
                        <div className="week-entry-time">{formatTimeRange(entry.startTime, entry.endTime)}</div>
                        <div className="week-entry-body">
                          <strong>{entry.title}</strong>
                          <span className="week-entry-source">↳ {entry.sourceLabel}</span>
                          {entryTask && schedulingTaskId === entryTask.id && (
                            <div className="week-entry-editor">{renderScheduleEditor(entryTask)}</div>
                          )}
                          {entryPlan && planFormMode === 'edit' && editingPlanItemId === entryPlan.id && (
                            <form className="schedule-form week-entry-editor" onSubmit={(event) => submitPlanForm(event, entryPlan.date)}>
                              <label>
                                Title
                                <Input value={planTitle} onChange={(event) => setPlanTitle(event.target.value)} autoFocus />
                              </label>
                              <div className="schedule-form-times">
                                <label>
                                  Start time
                                  <Input type="time" required value={planStart} onChange={(event) => setPlanStart(event.target.value)} />
                                </label>
                                <label>
                                  End time
                                  <Input type="time" required value={planEnd} onChange={(event) => setPlanEnd(event.target.value)} />
                                </label>
                              </div>
                              <div className="schedule-form-actions">
                                <Button type="submit" className="primary-action">Save</Button>
                                <Button type="button" variant="outline" onClick={closePlanForm}>Cancel</Button>
                              </div>
                            </form>
                          )}
                        </div>
                        {entry.kind === 'task' && entryTask && schedulingTaskId !== entryTask.id && (
                          <button type="button" className="week-entry-edit" onClick={() => openSchedule(entryTask)}>
                            Reschedule
                          </button>
                        )}
                        {entry.kind === 'plan' && entryPlan && !(planFormMode === 'edit' && editingPlanItemId === entryPlan.id) && (
                          <div className="week-entry-plan-actions">
                            <button type="button" className="week-entry-edit" aria-label={`Edit ${entry.title}`} onClick={() => openEditPlan(entryPlan)}>
                              <Pencil />
                            </button>
                            <button type="button" className="week-entry-delete" aria-label={`Remove ${entry.title} from plan`} onClick={() => deletePlanItem(entryPlan.id)}>
                              <Trash2 />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {planFormMode === 'closed' && (
                <Button type="button" variant="outline" className="add-to-plan-button" onClick={openAddPlan}>
                  <Plus /> Add to plan
                </Button>
              )}

              {planFormMode === 'add' && (
                <form className="plan-form" onSubmit={(event) => submitPlanForm(event, activeDay)}>
                  <label>
                    Title
                    <Input value={planTitle} onChange={(event) => setPlanTitle(event.target.value)} placeholder="e.g. Gym" autoFocus />
                  </label>
                  <div className="schedule-form-times">
                    <label>
                      Start time
                      <Input type="time" required value={planStart} onChange={(event) => setPlanStart(event.target.value)} />
                    </label>
                    <label>
                      End time
                      <Input type="time" required value={planEnd} onChange={(event) => setPlanEnd(event.target.value)} />
                    </label>
                  </div>
                  <div className="task-form-actions">
                    <Button type="submit" className="primary-action">Save</Button>
                    <Button type="button" variant="outline" onClick={closePlanForm}>Cancel</Button>
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      )}

      {closedTasks.length > 0 && (
        <section className="editorial-section" aria-labelledby="task-history-title">
          <div className="section-title">
            <div>
              <h2 id="task-history-title">Completed</h2>
            </div>
            <small>{closedTasks.length}</small>
          </div>
          <div className="task-list closed">{closedTasks.map((task) => renderTaskRow(task, true))}</div>
        </section>
      )}

      <section className="insight-strip">
        <ListChecks aria-hidden="true" />
        <div>
          <p className="companion-label">How this connects</p>
          <strong>Every open task adds to your active load above — finishing or skipping one frees up room right away.</strong>
        </div>
      </section>
    </div>
  );
}
