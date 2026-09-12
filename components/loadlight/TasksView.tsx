'use client';

import { useMemo, useState } from 'react';
import { Check, CheckCircle2, Circle, CircleDot, ListChecks, Plus, Trash2, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Lumi } from '@/components/loadlight/Lumi';
import { activeDayTaskLoad, activeDayTasks, activeWeekTaskLoad, activeWeekTasks, addDaysISO, DEFAULT_WORKLOAD_WEEK_ANCHOR, computeSmartPriority, taskDailyLoadPoints, taskLoadPoints, workloadWeekRange } from '@/lib/loadlight/load-logic';
import type {
  Demand,
  Flexibility,
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

function todayISO(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function compactDateLabel(date: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

function rangeLabel(start: string, end: string): string {
  return `${compactDateLabel(start)} - ${compactDateLabel(end)}`;
}

// --- Component ------------------------------------------------------------

export function TasksView({ stored, onSave, selectedWeekAnchor, onSelectedWeekChange }: { stored: StoredLoadLightState; onSave: (next: StoredLoadLightState, message: string) => void; selectedWeekAnchor: string; onSelectedWeekChange: (anchor: string) => void }) {
  const tasks = stored.tasks ?? [];
  const defaultFormDate = useMemo(() => todayISO(), []);
  const [mode, setMode] = useState<'list' | 'day' | 'week'>('list');
  const [formOpen, setFormOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('academic');
  const [customCategory, setCustomCategory] = useState('');
  const [startDate, setStartDate] = useState(defaultFormDate);
  const [dueDate, setDueDate] = useState(defaultFormDate);
  const [hours, setHours] = useState('');
  const [flexibility, setFlexibility] = useState<Flexibility>('flexible');
  const [selectedDay, setSelectedDay] = useState(defaultFormDate);
  const pendingTasks = tasks.filter((task) => task.status !== 'done' && task.status !== 'skipped');
  const closedTasks = tasks.filter((task) => task.status === 'done' || task.status === 'skipped');
  const load = useMemo(() => activeWeekTaskLoad(pendingTasks, selectedWeekAnchor), [pendingTasks, selectedWeekAnchor]);
  const loadPercent = Math.min(120, Math.round(load));
  const tone = loadStatusTone(load);
  const draftHours = Number(hours);
  const draftTaskLoad = title.trim() && draftHours > 0
    ? taskLoadPoints({
      id: 'draft-task',
      title,
      date: dueDate,
      scheduledDate: startDate,
      timeLabel: 'Flexible',
      durationHours: draftHours,
      demand: demandFromHours(draftHours),
      category,
      customCategory,
      flexibility,
      loadMix: {},
      status: 'not-started',
    })
    : 0;
  const draftLoadPercent = Math.min(120, loadPercent + draftTaskLoad);

  function resetForm() {
    setTitle('');
    setCategory('academic');
    setCustomCategory('');
    setStartDate(defaultFormDate);
    setDueDate(defaultFormDate);
    setHours('');
    setFlexibility('flexible');
  }

  function addTask(event: React.FormEvent) {
    event.preventDefault();
    const parsedHours = Number(hours);
    if (!title.trim() || !parsedHours || parsedHours <= 0) return;
    const taskWeek = workloadWeekRange(startDate || DEFAULT_WORKLOAD_WEEK_ANCHOR);

    const task: Task = {
      id: newTaskId(title),
      title: title.trim(),
      date: dueDate,
      scheduledDate: startDate,
      timeLabel: 'Flexible',
      durationHours: parsedHours,
      demand: demandFromHours(parsedHours),
      category,
      customCategory: category === 'other' ? customCategory.trim() : undefined,
      flexibility,
      loadMix: {},
      status: 'not-started',
      weekStart: taskWeek.start,
      weekEnd: taskWeek.end,
      autoScheduled: false,
    };
    onSave({ ...stored, tasks: [task, ...tasks] }, 'Task added.');
    onSelectedWeekChange(startDate);
    setSelectedDay(startDate);
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

  function renderTaskRow(task: Task, closed: boolean) {
    const status = task.status ?? 'not-started';
    const StatusIcon = statusIcon(status);
    const isDropped = status === 'skipped';
    const ClosedIcon = isDropped ? X : CheckCircle2;
    const closedLabel = isDropped ? 'Dropped' : statusLabels.done;
    const appliedPriority = computeSmartPriority(task, tasks);

    return (
      <article className={`task-row${closed ? ' closed' : ''}`} key={task.id}>
        <div className="task-row-header">
          <strong className={closed ? (isDropped ? 'dropped-text' : 'done-text') : ''}>{task.title}</strong>
          {closed ? (
            <span className={`status-toggle-btn static ${isDropped ? 'skipped' : 'done'}`}>
              <ClosedIcon /> {closedLabel}
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
          <p className="task-field"><span className="field-label">Start date</span>{task.scheduledDate || 'No start set'}</p>
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
              <span className={`completed-label${isDropped ? ' dropped' : ''}`}>{closedLabel}</span>
              <button type="button" className="text-action-btn" onClick={() => undoTask(task)}>
                <Undo2 /> Undo
              </button>
            </>
          )}
        </div>
      </article>
    );
  }

  const selectedWeekTasksAll = activeWeekTasks(pendingTasks, selectedWeekAnchor);
  const selectedWeekLoad = activeWeekTaskLoad(pendingTasks, selectedWeekAnchor);
  const selectedWeek = workloadWeekRange(selectedWeekAnchor);
  const dayOptions = Array.from({ length: 7 }, (_, index) => addDaysISO(selectedWeek.start, index));
  const dayTasks = activeDayTasks(pendingTasks, selectedDay);
  const dayTaskPoints = activeDayTaskLoad(pendingTasks, selectedDay);
  const selectedWeekTasks = activeDayTasks(pendingTasks, selectedDay);
  const selectedWeekTaskPoints = activeDayTaskLoad(pendingTasks, selectedDay);
  const weekDayLoads = dayOptions.map((date) => ({
    date,
    points: activeDayTaskLoad(pendingTasks, date),
    count: activeDayTasks(pendingTasks, date).length,
  }));
  const nextWeekAnchor = addDaysISO(selectedWeek.start, 7);
  const nextWeekTasks = activeWeekTasks(pendingTasks, nextWeekAnchor);
  const nextWeekTaskPoints = nextWeekTasks.reduce((total, task) => total + taskLoadPoints(task), 0);
  function choosePlanWeek(anchor: string) {
    const week = workloadWeekRange(anchor);
    onSelectedWeekChange(anchor);
    setSelectedDay(week.start);
  }

  function choosePlanDay(day: string) {
    setSelectedDay(day);
    onSelectedWeekChange(day);
  }

  function renderWeekPicker() {
    return (
      <div className="plan-week-picker" aria-label="Choose week">
        <button type="button" onClick={() => choosePlanWeek(addDaysISO(selectedWeek.start, -7))}>Previous</button>
        <label>
          <span>Pick week</span>
          <Input type="date" value={selectedWeekAnchor} onChange={(event) => choosePlanWeek(event.target.value)} aria-label="Pick week date" />
        </label>
        <button type="button" onClick={() => choosePlanWeek(addDaysISO(selectedWeek.start, 7))}>Next</button>
        <small>{rangeLabel(selectedWeek.start, selectedWeek.end)}</small>
      </div>
    );
  }

  function renderDayPicker() {
    return (
      <label className="plan-day-picker">
        <span>Pick day</span>
        <Input type="date" value={selectedDay} onChange={(event) => choosePlanDay(event.target.value)} aria-label="Pick day date" />
      </label>
    );
  }

  return (
    <div className="view-content tasks-view">
      <header className="page-header">
        <p className="date-label">TODAY · {todayHeaderLabel()}</p>
        <h1>Tasks</h1>
      </header>

      <section className="tasks-load-card" aria-label={`Current active load ${loadPercent} percent`}>
        <Lumi state={tone === 'danger' ? 'overwhelmed' : tone === 'warning' ? 'tired' : 'steady'} size="small" />
        <div>
          <p className="micro-label">ACTIVE LOAD</p>
          <strong className={`load-figure ${tone}`}>{loadPercent}%</strong>
          <p>
            {selectedWeekTasksAll.length} task{selectedWeekTasksAll.length === 1 ? '' : 's'} selected week · {pendingTasks.length} open total
          </p>
        </div>
      </section>

      <div className="tasks-mode-toggle" role="tablist" aria-label="Task view">
        <button type="button" role="tab" aria-selected={mode === 'list'} className={mode === 'list' ? 'active' : ''} onClick={() => setMode('list')}>
          To-Do List
        </button>
        <button type="button" role="tab" aria-selected={mode === 'day'} className={mode === 'day' ? 'active' : ''} onClick={() => setMode('day')}>
          Day plan
        </button>
        <button type="button" role="tab" aria-selected={mode === 'week'} className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>
          Weekly plan
        </button>
      </div>

      {mode === 'list' && (
        <section className="editorial-section" aria-labelledby="task-list-title">
          <div className="section-title">
            <div>
              <h2 id="task-list-title">Open tasks</h2>
            </div>
            <small>{pendingTasks.length} open</small>
          </div>

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
                <legend>When will you start?</legend>
                <Input
                  type="date"
                  value={startDate}
                  min={defaultFormDate}
                  max={addDaysISO(defaultFormDate, 30)}
                  onChange={(event) => {
                    const nextStart = event.target.value;
                    setStartDate(nextStart);
                    if (dueDate && dueDate < nextStart) setDueDate(nextStart);
                  }}
                  aria-label="Start date"
                />
              </fieldset>

              <fieldset className="task-form-fieldset">
                <legend>When is it due?</legend>
                <Input type="date" value={dueDate} min={startDate || defaultFormDate} max={addDaysISO(defaultFormDate, 60)} onChange={(event) => setDueDate(event.target.value)} aria-label="Due date" />
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

              {draftTaskLoad > 0 && (
                <div className={`task-load-preview ${loadStatusTone(draftLoadPercent)}`}>
                  <span>Auto load estimate</span>
                  <strong>{loadPercent}% → {draftLoadPercent}%</strong>
                  <p>This task adds about {draftTaskLoad}% load based on time, effort, and flexibility.</p>
                </div>
              )}

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

                <div className="task-week-note" aria-label="Task date note">
                  <span>Start date sets the day and week load. Due date helps calculate priority.</span>
                </div>
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

          {pendingTasks.length === 0 && <p className="empty-scenario-note">Nothing open right now. Add a task above when something new comes in.</p>}

          <div className="task-list">{pendingTasks.map((task) => renderTaskRow(task, false))}</div>
        </section>
      )}

      {mode === 'day' && (
        <section className="editorial-section" aria-labelledby="day-title">
          <div className="section-title">
            <div>
              <h2 id="day-title">Day plan</h2>
            </div>
            <small>{dayTaskPoints} pts</small>
          </div>
          {renderDayPicker()}
          <div className="week-load-summary day-summary">
            <div>
              <span>Day</span>
              <strong>{dayTaskPoints}%</strong>
            </div>
            <p>{dayTasks.length} task{dayTasks.length === 1 ? '' : 's'} active on {compactDateLabel(selectedDay)}. Multi-day tasks are spread across their date range.</p>
          </div>
          <div className="weekly-task-plan">
            {dayTasks.length ? dayTasks.map((task) => {
              const priority = computeSmartPriority(task, tasks);
              return (
                <article className="weekly-task-card" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{categoryLabel(task)} · {task.durationHours}h total · {priorityLabels[priority]} priority</span>
                  </div>
                  <b>{taskDailyLoadPoints(task)} pts today</b>
                </article>
              );
            }) : <p className="empty-scenario-note">No tasks active on this day. Pick another day or add a task with a start date.</p>}
          </div>
        </section>
      )}

      {mode === 'week' && (
        <section className="editorial-section" aria-labelledby="week-title">
          <div className="section-title">
            <div>
              <h2 id="week-title">Weekly plan</h2>
            </div>
            <small>{selectedWeekLoad} pts</small>
          </div>
          <div className="week-load-summary">
            <div>
              <span>Selected week</span>
              <strong>{selectedWeekLoad}%</strong>
            </div>
            <p>{selectedWeekTasksAll.length} active task{selectedWeekTasksAll.length === 1 ? '' : 's'} from {compactDateLabel(selectedWeek.start)} to {compactDateLabel(selectedWeek.end)}.</p>
          </div>
          {renderWeekPicker()}
          <div className="day-picker-row week-day-picker" aria-label="Choose a day in weekly plan">
            {weekDayLoads.map((day) => (
              <button type="button" className={selectedDay === day.date ? 'active' : ''} key={day.date} onClick={() => setSelectedDay(day.date)}>
                <span>{compactDateLabel(day.date)}</span>
                <strong>{day.points} pts</strong>
                <small>{day.count} task{day.count === 1 ? '' : 's'}</small>
              </button>
            ))}
          </div>
          <div className="section-title selected-day-title">
            <div>
              <h3>{compactDateLabel(selectedDay)}</h3>
              <p>{selectedWeekTaskPoints}% active on this day. Multi-day tasks are spread across their range.</p>
            </div>
            <small>{selectedWeekTasks.length} task{selectedWeekTasks.length === 1 ? '' : 's'}</small>
          </div>
          <div className="weekly-task-plan">
            {selectedWeekTasks.length ? selectedWeekTasks.map((task) => {
              const priority = computeSmartPriority(task, tasks);
              return (
                <article className="weekly-task-card" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{categoryLabel(task)} · {task.durationHours}h total · {priorityLabels[priority]} priority</span>
                  </div>
                  <b>{taskDailyLoadPoints(task)} pts today</b>
                </article>
              );
            }) : <p className="empty-scenario-note">No tasks active on this day. Pick another day in the week.</p>}
          </div>

          {nextWeekTasks.length > 0 && (
            <>
              <div className="section-title next-week-title">
                <div>
                  <h3>Next week</h3>
                  <p>Tasks moved out of this week appear here.</p>
                </div>
                <small>{nextWeekTaskPoints} pts</small>
              </div>
              <div className="weekly-task-plan">
                {nextWeekTasks.map((task) => {
                  const priority = computeSmartPriority(task, tasks);
                  return (
                    <article className="weekly-task-card moved" key={task.id}>
                      <div>
                        <strong>{task.title}</strong>
                        <span>Moved to next week · {categoryLabel(task)} · {task.durationHours}h · {priorityLabels[priority]} priority</span>
                      </div>
                      <b>{taskLoadPoints(task)} pts</b>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {closedTasks.length > 0 && (
        <section className="editorial-section" aria-labelledby="task-history-title">
          <div className="section-title">
            <div>
              <h2 id="task-history-title">Task history</h2>
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
