'use client';

import { useMemo, useState } from 'react';
import { Check, CircleDashed, ListChecks, Loader, Plus, SkipForward, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Lumi } from '@/components/loadlight/Lumi';
import { activeTaskLoad, computeSmartPriority, taskLoadPoints } from '@/lib/loadlight/load-logic';
import { weekPlan } from '@/lib/loadlight/demo-data';
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
const categoryLookup = Object.fromEntries(categoryOptions.map((option) => [option.value, option])) as Record<
  TaskCategory,
  (typeof categoryOptions)[number]
>;

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
  done: 'Done',
  skipped: 'Skipped',
};

function nextStatus(status: TaskStatus): TaskStatus {
  if (status === 'not-started') return 'in-progress';
  if (status === 'in-progress') return 'done';
  return 'not-started';
}

function statusIcon(status: TaskStatus) {
  if (status === 'done') return Check;
  if (status === 'in-progress') return Loader;
  if (status === 'skipped') return SkipForward;
  return CircleDashed;
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

// --- Component ------------------------------------------------------------

export function TasksView({ stored, onSave }: { stored: StoredLoadLightState; onSave: (next: StoredLoadLightState, message: string) => void }) {
  const tasks = stored.tasks ?? [];
  const [mode, setMode] = useState<'list' | 'week'>('list');
  const [formOpen, setFormOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('academic');
  const [customCategory, setCustomCategory] = useState('');
  const [hours, setHours] = useState('');
  const [flexibility, setFlexibility] = useState<Flexibility>('flexible');
  const [date, setDate] = useState('');

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
    };
    onSave({ ...stored, tasks: [task, ...tasks] }, 'Task added.');
    resetForm();
    setFormOpen(false);
  }

  function cycleStatus(task: Task) {
    const updated = nextStatus(task.status ?? 'not-started');
    onSave(
      { ...stored, tasks: tasks.map((item) => (item.id === task.id ? { ...item, status: updated } : item)) },
      updated === 'done' ? 'Nice — one less thing to carry.' : 'Task updated.',
    );
  }

  function skipTask(task: Task) {
    onSave(
      { ...stored, tasks: tasks.map((item) => (item.id === task.id ? { ...item, status: 'skipped' } : item)) },
      'Marked as skipped — load recalculated.',
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
    const StatusIcon = statusIcon(task.status ?? 'not-started');
    const points = taskLoadPoints(task);
    const appliedPriority = computeSmartPriority(task, tasks);

    return (
      <article className={`task-row${closed ? ' closed' : ''}`} key={task.id}>
        {closed ? (
          <span className={`status-toggle-btn static ${task.status}`}>
            <StatusIcon /> {statusLabels[task.status ?? 'done']}
          </span>
        ) : (
          <button
            type="button"
            className={`status-toggle-btn ${task.status ?? 'not-started'}`}
            onClick={() => cycleStatus(task)}
          >
            <StatusIcon/> {statusLabels[task.status ?? 'not-started']}
          </button>
        )}
        <div className="task-info">
          <strong>{task.title}</strong>
          <p className="task-field"><span className="field-label">Category</span>{categoryLabel(task)}</p>
          <p className="task-field"><span className="field-label">Estimated time</span>{task.durationHours}h</p>
          <p className="task-field"><span className="field-label">Due date</span>{task.date || 'No date set'}</p>
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
          <small>{points} pts</small>
          {!closed && (
            <button type="button" aria-label={`Skip ${task.title}`} onClick={() => skipTask(task)}>
              <SkipForward />
            </button>
          )}
          <button type="button" aria-label={`Delete ${task.title}`} onClick={() => deleteTask(task.id)}>
            <Trash2 />
          </button>
        </div>
      </article>
    );
  }

  // --- Weekly view grouping ---
  const weekBuckets = weekPlan.map((day) => ({
    ...day,
    tasks: pendingTasks.filter((task) => task.date === day.date),
  }));
  const otherTasks = pendingTasks.filter((task) => !weekPlan.some((day) => day.date === task.date));
  const [activeDay, setActiveDay] = useState<string>(weekPlan[0]?.date ?? '');
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
            {pendingTasks.length} task{pendingTasks.length === 1 ? '' : 's'} still open
          </p>
        </div>
      </section>

      <div className="tasks-mode-toggle" role="tablist" aria-label="Task view">
        <button type="button" role="tab" aria-selected={mode === 'list'} className={mode === 'list' ? 'active' : ''} onClick={() => setMode('list')}>
          To-Do-List
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
              <h2 id="week-title">This week</h2>
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
                onClick={() => setActiveDay(day.date)}
              >
                {day.dayLabel}
              </button>
            ))}
            {otherTasks.length > 0 && (
              <button type="button" role="tab" aria-selected={activeDay === 'other'} className={activeDay === 'other' ? 'active' : ''} onClick={() => setActiveDay('other')}>
                Other
              </button>
            )}
          </div>

          {activeDay !== 'other' && activeDayBucket && (
            <>
              <div className="week-day-summary">
                <span>{activeDayBucket.dayLabel}</span>
                <span>{activeTaskLoad(activeDayBucket.tasks)} pts carried</span>
              </div>
              <div className="task-list">
                {activeDayBucket.tasks.length === 0 ? (
                  <p className="empty-scenario-note">Nothing scheduled this day.</p>
                ) : (
                  activeDayBucket.tasks.map((task) => renderTaskRow(task, false))
                )}
              </div>
            </>
          )}

          {activeDay === 'other' && <div className="task-list">{otherTasks.map((task) => renderTaskRow(task, false))}</div>}
        </section>
      )}

      {closedTasks.length > 0 && (
        <section className="editorial-section" aria-labelledby="task-history-title">
          <div className="section-title">
            <div>
              <h2 id="task-history-title">Done &amp; skipped</h2>
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