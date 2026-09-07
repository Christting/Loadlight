'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, LoaderCircle, Plus, RefreshCcw, Save, Search, Trash2, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lumi } from '@/components/loadlight/Lumi';
import { timelineLabels, todayFiveLoads, weekPlan } from '@/lib/loadlight/demo-data';
import type { LoadDimension, StoredLoadLightState, WhatIfPlan } from '@/lib/loadlight/types';

type ScenarioStep = 'overview' | 'define' | 'processing' | 'results';
type ScenarioAdjustments = Record<LoadDimension, number>;
type ScenarioAnswerKey = 'timeNeeded' | 'deadlinePressure' | 'peopleInvolved' | 'physicalEffort' | 'extraErrands' | 'flexibility';
type ScenarioAnswers = Record<ScenarioAnswerKey, string>;

const loadRows = [
  { key: 'mental', label: 'Mental', mark: 'M', tone: 'lavender' },
  { key: 'time', label: 'Time', mark: 'T', tone: 'blue' },
  { key: 'physical', label: 'Physical', mark: 'P', tone: 'peach' },
  { key: 'social', label: 'Social', mark: 'S', tone: 'pink' },
  { key: 'errands', label: 'Errands', mark: 'E', tone: 'sage' },
] as const;

const baseWhatIfLoad = 78;
const whatIfRangeLabel = '8-12 Sept';

const defaultScenarioAdjustments: ScenarioAdjustments = {
  mental: 8,
  time: 10,
  physical: 0,
  social: 6,
  errands: 5,
};

const defaultScenarioAnswers: ScenarioAnswers = {
  timeNeeded: 'medium',
  deadlinePressure: 'medium',
  peopleInvolved: 'small',
  physicalEffort: 'none',
  extraErrands: 'some',
  flexibility: 'movable',
};

const scenarioQuestions: Array<{
  key: ScenarioAnswerKey;
  prompt: string;
  options: Array<{ value: string; label: string; note: string }>;
}> = [
  {
    key: 'timeNeeded',
    prompt: 'How much time will it take?',
    options: [
      { value: 'light', label: '1-2h', note: 'small slot' },
      { value: 'medium', label: '3-5h', note: 'half day' },
      { value: 'heavy', label: '6h+', note: 'big block' },
    ],
  },
  {
    key: 'deadlinePressure',
    prompt: 'How intense is the deadline?',
    options: [
      { value: 'low', label: 'Calm', note: 'no rush' },
      { value: 'medium', label: 'Soon', note: 'some pressure' },
      { value: 'high', label: 'Urgent', note: 'high pressure' },
    ],
  },
  {
    key: 'peopleInvolved',
    prompt: 'Who is involved?',
    options: [
      { value: 'solo', label: 'Just me', note: 'solo work' },
      { value: 'small', label: 'Small group', note: 'few people' },
      { value: 'many', label: 'Many people', note: 'more coordination' },
    ],
  },
  {
    key: 'physicalEffort',
    prompt: 'Will it drain physical energy?',
    options: [
      { value: 'none', label: 'No', note: 'mostly desk' },
      { value: 'some', label: 'Some', note: 'light effort' },
      { value: 'lot', label: 'A lot', note: 'tiring' },
    ],
  },
  {
    key: 'extraErrands',
    prompt: 'Any extra admin or errands?',
    options: [
      { value: 'none', label: 'None', note: 'clean' },
      { value: 'some', label: 'Some', note: 'a few tasks' },
      { value: 'lot', label: 'A lot', note: 'many loose ends' },
    ],
  },
  {
    key: 'flexibility',
    prompt: 'Can I move it if needed?',
    options: [
      { value: 'fixed', label: 'Fixed', note: 'hard to move' },
      { value: 'movable', label: 'Maybe', note: 'some room' },
      { value: 'flexible', label: 'Flexible', note: 'easy to move' },
    ],
  },
];

const defineStepCount = scenarioQuestions.length + 2;
const reviewStepIndex = defineStepCount - 1;

const scenarioTemplates: Array<{ title: string; note: string; adjustments: ScenarioAdjustments }> = [
  { title: 'Adding a new project', note: 'Fresh deadline, more focus time, less social space.', adjustments: { mental: 10, time: 18, physical: 2, social: -4, errands: 5 } },
  { title: 'Weekend trip home', note: 'Travel time and errands rise, social load gets lighter.', adjustments: { mental: 2, time: 14, physical: 8, social: -8, errands: 10 } },
  { title: 'Club event week', note: 'Social energy rises while errands and time stay tight.', adjustments: { mental: 4, time: 10, physical: 4, social: 16, errands: 3 } },
];

const dimensionLabels: Record<LoadDimension, string> = {
  mental: 'Mental',
  time: 'Time',
  physical: 'Physical',
  social: 'Social',
  errands: 'Errands',
};

function WhatIfHeader({ backLabel, label, onBack, title }: { backLabel?: string; label: string; onBack?: () => void; title: string }) {
  return <header className={`whatif-header ${onBack ? '' : 'solo'}`}>
    <div className="whatif-header-row">
      {onBack ? <button className="back-link" type="button" onClick={onBack}><ChevronLeft /> {backLabel}</button> : <span className="whatif-header-kicker">{label}</span>}
      <span className="whatif-header-chip">{onBack ? label : 'Guided check'}</span>
    </div>
    <h1>{title}</h1>
  </header>;
}

function clampLoad(value: number, max = 118) {
  return Math.max(0, Math.min(max, value));
}

function loadStatus(load: number) {
  if (load > 100) return { label: 'high risk', tone: 'danger', state: 'overwhelmed' as const };
  if (load >= 90) return { label: 'medium risk', tone: 'warning', state: 'stressed' as const };
  if (load >= 80) return { label: 'watch closely', tone: 'warning', state: 'tired' as const };
  return { label: 'safe range', tone: 'steady', state: 'steady' as const };
}

function scenarioImpact(adjustments: ScenarioAdjustments) {
  return Math.round(Object.values(adjustments).reduce((total, value) => total + value, 0) * 0.55);
}

function adjustedLoadValue(key: LoadDimension, change: number) {
  return Math.round(clampLoad(todayFiveLoads[key] + change, 100));
}

function forecastTone(load: number) {
  if (load >= 96) return 'danger';
  if (load >= 86) return 'warning';
  return 'steady';
}

function scenarioForecast(adjustments: ScenarioAdjustments, projectedLoad = baseWhatIfLoad + scenarioImpact(adjustments)) {
  const weights = [0.08, 0.2, 0.38, 1, 0.18];
  const impact = Math.max(0, projectedLoad - baseWhatIfLoad);
  return weekPlan.slice(0, 5).map((day, index) => {
    const projected = Math.round(clampLoad(index === 3 ? projectedLoad : day.load + impact * weights[index], 108));
    return { ...day, projected, tone: forecastTone(projected) };
  });
}

function topScenarioDimension(adjustments: ScenarioAdjustments) {
  return loadRows
    .map((row) => ({ key: row.key, label: row.label, change: adjustments[row.key] }))
    .sort((a, b) => b.change - a.change)[0];
}

function scenarioRecommendation(load: number, dimension: string) {
  if (load > 100) return `This scenario pushes the week over capacity. Reduce ${dimension.toLowerCase()} load before committing.`;
  if (load >= 90) return `${dimension} becomes the main pressure point. Keep one flexible task ready to move.`;
  if (load >= 80) return `This is workable, but ${dimension.toLowerCase()} needs a small buffer.`;
  return 'This stays within a safe range. Save it as a backup plan.';
}

function scenarioDecision(load: number) {
  if (load > 100) return { label: 'Do not add yet', note: 'Make room first, then simulate again.' };
  if (load >= 90) return { label: 'Adjust before saying yes', note: 'Move or shrink one commitment before accepting.' };
  return { label: 'Looks workable', note: 'Keep a buffer and save this plan.' };
}

function formatAdjustment(value: number) {
  return value > 0 ? `+${value}%` : `${value}%`;
}

function answerScore(value: string, scores: Record<string, number>) {
  return scores[value] ?? 0;
}

function adjustmentsFromAnswers(answers: ScenarioAnswers): ScenarioAdjustments {
  const timeLoad = answerScore(answers.timeNeeded, { light: 4, medium: 10, heavy: 18 });
  const deadlineLoad = answerScore(answers.deadlinePressure, { low: 2, medium: 8, high: 15 });
  const flexibilityLoad = answerScore(answers.flexibility, { fixed: 6, movable: 0, flexible: -4 });
  return {
    mental: deadlineLoad + Math.round(timeLoad * 0.2) + Math.max(0, flexibilityLoad),
    time: timeLoad + flexibilityLoad,
    physical: answerScore(answers.physicalEffort, { none: 0, some: 5, lot: 12 }),
    social: answerScore(answers.peopleInvolved, { solo: 0, small: 6, many: 13 }),
    errands: answerScore(answers.extraErrands, { none: 0, some: 5, lot: 11 }),
  };
}

function answersFromAdjustments(sourceAdjustments: ScenarioAdjustments): ScenarioAnswers {
  return {
    timeNeeded: sourceAdjustments.time >= 15 ? 'heavy' : sourceAdjustments.time >= 7 ? 'medium' : 'light',
    deadlinePressure: sourceAdjustments.mental >= 14 ? 'high' : sourceAdjustments.mental >= 7 ? 'medium' : 'low',
    peopleInvolved: sourceAdjustments.social >= 10 ? 'many' : sourceAdjustments.social >= 4 ? 'small' : 'solo',
    physicalEffort: sourceAdjustments.physical >= 9 ? 'lot' : sourceAdjustments.physical >= 3 ? 'some' : 'none',
    extraErrands: sourceAdjustments.errands >= 9 ? 'lot' : sourceAdjustments.errands >= 3 ? 'some' : 'none',
    flexibility: sourceAdjustments.time >= 15 ? 'fixed' : sourceAdjustments.time <= 5 ? 'flexible' : 'movable',
  };
}

function buildScenarioSuggestions(load: number, dimension: string) {
  if (load > 100) return [
    `Remove at least ${Math.ceil(load - 96)}% from ${dimension.toLowerCase()} pressure.`,
    'Move one flexible task out of this date range.',
    'Save this as a warning plan before committing.',
  ];
  if (load >= 90) return [
    `Cap ${dimension.toLowerCase()} effort before the week starts.`,
    'Keep one evening unplanned as recovery space.',
    'Check the saved result again before saying yes.',
  ];
  return [
    'Keep the plan saved as a reference.',
    'Re-simulate if another commitment appears.',
    'Protect one low-load block for rest.',
  ];
}

function uniqueScenarioTitle(title: string, plans: WhatIfPlan[]) {
  const existingTitles = new Set(plans.map((plan) => plan.title.trim().toLowerCase()));
  const baseTitle = title.trim() || 'New scenario';
  if (!existingTitles.has(baseTitle.toLowerCase())) return baseTitle;
  const copyMatch = baseTitle.match(/^(.* copy)(?: \d+)?$/i);
  const copyBase = copyMatch?.[1];
  let copyNumber = 2;
  let nextTitle = copyBase ? `${copyBase} ${copyNumber}` : `${baseTitle} copy`;
  while (existingTitles.has(nextTitle.toLowerCase())) {
    copyNumber += 1;
    nextTitle = copyBase ? `${copyBase} ${copyNumber}` : `${baseTitle} copy ${copyNumber}`;
  }
  return nextTitle;
}

function scenarioIdFromTitle(title: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `what-if-${slug || 'scenario'}`;
}

export function WhatIfView({ stored, onSave }: { stored: StoredLoadLightState; onSave: (next: StoredLoadLightState, message: string) => void }) {
  const viewRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState<ScenarioStep>('overview');
  const [scenarioName, setScenarioName] = useState('New Major Project');
  const [adjustments, setAdjustments] = useState<ScenarioAdjustments>(defaultScenarioAdjustments);
  const [scenarioAnswers, setScenarioAnswers] = useState<ScenarioAnswers>(defaultScenarioAnswers);
  const [defineStep, setDefineStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reviewedPlanId, setReviewedPlanId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [scenarioSearch, setScenarioSearch] = useState('');

  const savedPlans = stored.whatIfPlans?.length ? stored.whatIfPlans : stored.whatIfPlan ? [stored.whatIfPlan] : [];
  const reviewedPlan = savedPlans.find((plan) => plan.id === reviewedPlanId);
  const editingPlan = savedPlans.find((plan) => plan.id === editingPlanId);
  const activeAdjustments = reviewedPlan?.adjustments ?? adjustments;
  const draftLoad = clampLoad(baseWhatIfLoad + scenarioImpact(adjustments), 118);
  const resultLoad = reviewedPlan ? reviewedPlan.projectedLoad : draftLoad;
  const resultStatus = loadStatus(resultLoad);
  const resultDecision = scenarioDecision(resultLoad);
  const topDimension = topScenarioDimension(activeAdjustments);
  const recommendation = reviewedPlan?.recommendation ?? scenarioRecommendation(resultLoad, topDimension.label);
  const suggestions = buildScenarioSuggestions(resultLoad, topDimension.label);
  const latestPlan = savedPlans[0];
  const currentQuestion = defineStep > 0 && defineStep <= scenarioQuestions.length ? scenarioQuestions[defineStep - 1] : null;
  const isReviewStep = defineStep === reviewStepIndex;
  const forecastDays = scenarioForecast(activeAdjustments, resultLoad);
  const peakForecastDay = [...forecastDays].sort((a, b) => b.projected - a.projected)[0];
  const overviewForecast = scenarioForecast(latestPlan?.adjustments ?? defaultScenarioAdjustments, latestPlan?.projectedLoad);
  const overviewPeakDay = [...overviewForecast].sort((a, b) => b.projected - a.projected)[0];
  const searchTerm = scenarioSearch.trim().toLowerCase();
  const filteredSavedPlans = searchTerm
    ? savedPlans.filter((plan) => {
      const planStatus = loadStatus(plan.projectedLoad);
      const dominantLabel = plan.dominantDimension ? dimensionLabels[plan.dominantDimension] : 'Load';
      return [
        plan.title,
        plan.savedAt,
        dominantLabel,
        plan.statusLabel ?? planStatus.label,
        `${plan.projectedLoad}%`,
      ].some((value) => value.toLowerCase().includes(searchTerm));
    })
    : savedPlans;

  useEffect(() => {
    viewRef.current?.scrollTo({ top: 0 });
  }, [step]);

  function makePlan(title: string, sourceAdjustments: ScenarioAdjustments, id: string): WhatIfPlan {
    const projectedLoad = clampLoad(baseWhatIfLoad + scenarioImpact(sourceAdjustments), 118);
    const dominant = topScenarioDimension(sourceAdjustments);
    return {
      id,
      title,
      dateLabel: whatIfRangeLabel,
      durationHours: 0,
      demand: projectedLoad >= 90 ? 'high' : 'medium',
      category: 'academic',
      currentLoad: baseWhatIfLoad,
      projectedLoad,
      balancedLoad: projectedLoad,
      adjustments: sourceAdjustments,
      dominantDimension: dominant.key,
      statusLabel: loadStatus(projectedLoad).label,
      recommendation: scenarioRecommendation(projectedLoad, dominant.label),
      acceptedMoveIds: [],
      savedAt: timelineLabels.today,
    };
  }

  function startCustomScenario() {
    setScenarioName('New Major Project');
    setAdjustments(defaultScenarioAdjustments);
    setScenarioAnswers(defaultScenarioAnswers);
    setDefineStep(0);
    setReviewedPlanId(null);
    setEditingPlanId(null);
    setStep('define');
  }

  function backToOverview() {
    setReviewedPlanId(null);
    setEditingPlanId(null);
    setStep('overview');
  }

  function updateScenarioAnswer(key: ScenarioAnswerKey, value: string) {
    setReviewedPlanId(null);
    setScenarioAnswers((current) => {
      const nextAnswers = { ...current, [key]: value };
      setAdjustments(adjustmentsFromAnswers(nextAnswers));
      return nextAnswers;
    });
  }

  function openTemplate(template: { title: string; adjustments: ScenarioAdjustments }) {
    setScenarioName(template.title);
    setAdjustments(template.adjustments);
    setReviewedPlanId(null);
    setEditingPlanId(null);
    setStep('results');
  }

  function openSavedScenario(plan: WhatIfPlan) {
    setScenarioName(plan.title);
    setAdjustments(plan.adjustments ?? defaultScenarioAdjustments);
    setReviewedPlanId(plan.id);
    setEditingPlanId(null);
    setStep('results');
  }

  function editResult() {
    if (reviewedPlan) {
      setScenarioName(reviewedPlan.title);
      const nextAdjustments = reviewedPlan.adjustments ?? defaultScenarioAdjustments;
      setAdjustments(nextAdjustments);
      setScenarioAnswers(answersFromAdjustments(nextAdjustments));
      setEditingPlanId(reviewedPlan.id);
    }
    setReviewedPlanId(null);
    setDefineStep(reviewStepIndex);
    setStep('define');
  }

  function previousDefineStep() {
    if (defineStep === 0) {
      backToOverview();
      return;
    }
    setDefineStep((current) => current - 1);
  }

  function nextDefineStep() {
    if (isReviewStep) {
      simulateScenario();
      return;
    }
    setDefineStep((current) => Math.min(reviewStepIndex, current + 1));
  }

  function simulateScenario() {
    setReviewedPlanId(null);
    setProgress(18);
    setStep('processing');
    window.setTimeout(() => setProgress(58), 350);
    window.setTimeout(() => setProgress(86), 750);
    window.setTimeout(() => setStep('results'), 1150);
  }

  function saveScenario() {
    const title = scenarioName.trim() || editingPlan?.title || reviewedPlan?.title || 'New scenario';
    const sourceAdjustments = { ...activeAdjustments };
    const shouldUpdate = Boolean(editingPlanId && editingPlan);
    const shouldCopy = Boolean(reviewedPlan && !editingPlanId);
    const comparablePlans = savedPlans.filter((plan) => plan.id !== editingPlanId);
    const nextTitle = shouldUpdate ? title : uniqueScenarioTitle(shouldCopy ? `${title} copy` : title, comparablePlans);
    const nextPlanId = shouldUpdate ? editingPlanId! : scenarioIdFromTitle(nextTitle);
    const nextPlan = makePlan(nextTitle, sourceAdjustments, nextPlanId);
    const nextPlans = [nextPlan, ...savedPlans.filter((plan) => plan.id !== nextPlan.id)];
    onSave({ ...stored, whatIfPlan: nextPlan, whatIfPlans: nextPlans }, `${shouldUpdate ? 'Updated' : 'Saved to My saved scenarios'}: ${nextPlan.title}`);
    setScenarioName(nextPlan.title);
    setReviewedPlanId(null);
    setEditingPlanId(null);
    setStep('overview');
  }

  function deleteScenario(id: string) {
    const nextPlans = savedPlans.filter((plan) => plan.id !== id);
    const nextState: StoredLoadLightState = { ...stored, whatIfPlans: nextPlans };
    if (nextPlans[0]) nextState.whatIfPlan = nextPlans[0];
    else delete nextState.whatIfPlan;
    onSave(nextState, 'Scenario removed.');
    if (reviewedPlanId === id) {
      setReviewedPlanId(null);
      setStep('overview');
    }
    if (editingPlanId === id) setEditingPlanId(null);
  }

  if (step === 'define') return <div className="view-content what-if-view" ref={viewRef}>
    <WhatIfHeader backLabel="Scenarios" label={editingPlan ? 'EDIT SCENARIO' : 'NEW SCENARIO'} onBack={backToOverview} title="Plan the change." />
    <section className="scenario-form" aria-labelledby="scenario-form-title">
      <div className="form-heading">
        <div><h2 id="scenario-form-title">Let’s test it first.</h2><p>Answer one thing at a time. Lumi will estimate the load.</p></div>
        <Lumi state="recovering" size="small" />
      </div>
      <div className="wizard-progress">
        <span>Step {defineStep + 1} of {defineStepCount}</span>
        <i aria-hidden="true"><b style={{ width: `${((defineStep + 1) / defineStepCount) * 100}%` }} /></i>
      </div>
      {defineStep === 0 && <div className="wizard-panel">
        <span className="scenario-step-label"><span>1</span><strong>Name the change</strong></span>
        <h3>What might I say yes to?</h3>
        <p>Give this possible commitment a name so the result is easy to find later.</p>
        <div className="plain-field"><label htmlFor="scenario-name">Scenario name</label><Input id="scenario-name" value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} /></div>
      </div>}
      {currentQuestion && <fieldset className="wizard-panel scenario-choice-group">
        <legend>{currentQuestion.prompt}</legend>
        <span className="scenario-step-label"><span>{defineStep + 1}</span><strong>Answer one question</strong></span>
        <p>Pick the closest answer. You can go back if it feels off.</p>
        <div>
          {currentQuestion.options.map((option) => {
            const selected = scenarioAnswers[currentQuestion.key] === option.value;
            return <button className={selected ? 'selected' : ''} type="button" key={option.value} onClick={() => updateScenarioAnswer(currentQuestion.key, option.value)} aria-pressed={selected}>
              <strong>{option.label}</strong>
              <small>{option.note}</small>
            </button>;
          })}
        </div>
      </fieldset>}
      {isReviewStep && <div className="wizard-panel">
        <span className="scenario-step-label"><span>{defineStepCount}</span><strong>Get my answer</strong></span>
        <h3>Here’s Lumi’s estimate.</h3>
        <p>If this still feels realistic, show the full impact before deciding.</p>
        <div className="date-range">
          <span>Affected date range</span>
          <strong>Starts: Monday, 8 Sept</strong>
          <strong>Ends: Friday, 12 Sept</strong>
        </div>
        <div className="draft-preview">
          <span><small>Now</small><strong>{baseWhatIfLoad}%</strong></span>
          <ArrowRight aria-hidden="true" />
          <span><small>If I add it</small><strong>{draftLoad}%</strong></span>
        </div>
        <div className="auto-breakdown" aria-label="Estimated load changes">
          <span>Lumi's estimate</span>
          {loadRows.map((row) => <p key={row.key}>
            <i className={`load-mark ${row.tone}`} aria-hidden="true">{row.mark}</i>
            <small>{dimensionLabels[row.key]}</small>
            <strong>{formatAdjustment(adjustments[row.key])}</strong>
          </p>)}
        </div>
      </div>}
      <div className="wizard-actions">
        <Button type="button" variant="outline" onClick={previousDefineStep}>{defineStep === 0 ? 'Cancel' : 'Back'}</Button>
        <Button type="button" className="simulate-button" onClick={nextDefineStep} disabled={defineStep === 0 && !scenarioName.trim()}>
          {isReviewStep ? 'Show me the impact' : 'Next'} {isReviewStep && <WandSparkles />}
        </Button>
      </div>
    </section>
  </div>;

  if (step === 'processing') return <div className="view-content what-if-view processing-view" ref={viewRef}>
    <WhatIfHeader label="PROCESSING" title="Calculating impact." />
    <section className="processing-card" aria-label="Processing scenario data">
      <Lumi state="recovering" size="large" />
      <LoaderCircle className="spin-icon" aria-hidden="true" />
      <h2>Calculating future impact...</h2>
      <p>Checking load balance, pressure spikes, and recovery room.</p>
      <progress value={progress} max={100} aria-label="Scenario processing progress" />
    </section>
  </div>;

  if (step === 'results') return <div className="view-content what-if-view" ref={viewRef}>
    <WhatIfHeader backLabel="Edit" label="SCENARIO RESULTS" onBack={editResult} title={reviewedPlan?.title || scenarioName || 'New scenario'} />
    <section className={`result-card ${resultStatus.tone}`} aria-labelledby="result-title">
      <div className="result-heading">
        <span>{reviewedPlan?.title || scenarioName || 'New scenario'}</span>
        <h2 id="result-title">Projected load: {resultLoad}%</h2>
      </div>
      <div className="decision-strip">
        <span>{resultDecision.label}</span>
        <small>{resultDecision.note}</small>
      </div>
      <div className="lumi-comparison"><Lumi state="steady" size="small" /><ArrowRight aria-hidden="true" /><Lumi state={resultStatus.state} size="small" /></div>
      <div className="impact-meter" aria-label={`Load changes from ${baseWhatIfLoad} percent to ${resultLoad} percent`}>
        <span><small>Now</small><strong>{baseWhatIfLoad}%</strong></span>
        <i aria-hidden="true" />
        <span><small>After</small><strong>{resultLoad}%</strong></span>
      </div>
      <div className="summary-pair"><span><small>Current</small><strong>{reviewedPlan?.currentLoad ?? baseWhatIfLoad}%</strong></span><span><small>Simulated</small><strong>{resultLoad}%</strong></span></div>
      <p>{recommendation}</p>
    </section>
    <section className="forecast-card" aria-labelledby="forecast-title">
      <div className="section-title"><div><h2 id="forecast-title">Future load map</h2></div><small>Peak {peakForecastDay.dayLabel} · {peakForecastDay.projected}%</small></div>
      <div className="forecast-bars">
        {forecastDays.map((day) => <span className={day.tone} key={day.dayLabel}>
          <small>{day.dayLabel}</small>
          <i style={{ height: `${Math.min(100, Math.max(26, day.projected))}%` }} />
          <strong>{day.projected}%</strong>
        </span>)}
      </div>
    </section>
    <section className="editorial-section" aria-labelledby="comparison-title">
      <div className="section-title"><div><h2 id="comparison-title">Before and after</h2></div></div>
      <div className="comparison-list">
        {loadRows.map((row) => {
          const before = todayFiveLoads[row.key];
          const after = adjustedLoadValue(row.key, activeAdjustments[row.key]);
          const risk = after >= 90 ? 'red risk' : after >= 75 ? 'yellow risk' : 'okay';
          return <div className="comparison-row" key={row.key}>
            <span className={`load-mark ${row.tone}`} aria-hidden="true">{row.mark}</span>
            <span>{dimensionLabels[row.key]}</span>
            <strong>{before}%</strong>
            <ArrowRight aria-hidden="true" />
            <strong>{after}%</strong>
            <small>{risk}</small>
            <div className="comparison-bar" role="presentation"><i style={{ width: `${after}%` }} /></div>
          </div>;
        })}
      </div>
    </section>
    <section className="editorial-section action-suggestions" aria-labelledby="actions-title">
      <div className="section-title"><div><h2 id="actions-title">Lumi suggests</h2></div></div>
      {suggestions.map((suggestion, index) => <article key={suggestion}><span>{index + 1}</span><p>{suggestion}</p></article>)}
    </section>
    <section className="result-actions">
      <Button type="button" className="primary-action" onClick={saveScenario}><Save /> {editingPlan ? 'Update scenario' : reviewedPlan ? 'Save as copy' : 'Save scenario'}</Button>
      <Button type="button" variant="outline" onClick={editResult}><RefreshCcw /> Adjust</Button>
      <Button type="button" variant="outline" onClick={backToOverview}>Back to list</Button>
    </section>
  </div>;

  return <div className="view-content what-if-view" ref={viewRef}>
    <WhatIfHeader label={timelineLabels.today} title="Can I take this on?" />
    <section className="whatif-dashboard-card" aria-labelledby="whatif-dashboard-title">
      <div className="whatif-card-title">
        <span>Before I say yes</span>
        <small>{savedPlans.length} saved</small>
      </div>
      <div className="decision-load-row">
        <span><small>My load now</small><strong>{baseWhatIfLoad}%</strong></span>
        <ArrowRight aria-hidden="true" />
        <span><small>{latestPlan ? 'Last answer' : 'Next answer'}</small><strong>{latestPlan ? `${latestPlan.projectedLoad}%` : '?'}</strong></span>
      </div>
      <div className="whatif-next-action">
        <Lumi state={latestPlan ? loadStatus(latestPlan.projectedLoad).state : 'steady'} size="large" />
        <div>
          <span className="section-kicker">First move</span>
          <h2 id="whatif-dashboard-title">Test the commitment before I agree.</h2>
          <Button type="button" className="primary-action" onClick={startCustomScenario}><Plus /> Try my own change</Button>
        </div>
      </div>
      <div className="flow-steps" aria-label="Scenario flow">
        <span><strong>1</strong><small>Add the change</small></span>
        <span><strong>2</strong><small>Answer questions</small></span>
        <span><strong>3</strong><small>Save the answer</small></span>
      </div>
      <div className="mini-forecast" aria-label="Quick future load preview">
        {overviewForecast.map((day) => <span className={day.tone} key={day.dayLabel}><i style={{ height: `${Math.min(100, Math.max(22, day.projected))}%` }} /><small>{day.dayLabel}</small></span>)}
      </div>
      <div className="radar-strip">
        <span><small>Peak day</small><strong>{overviewPeakDay.dayLabel}</strong></span>
        <span><small>Forecast</small><strong>{overviewPeakDay.projected}%</strong></span>
      </div>
    </section>
    <section className="editorial-section saved-scenarios" aria-labelledby="saved-title">
      <div className="section-title"><div><h2 id="saved-title">Saved answers</h2></div><small>{savedPlans.length} saved</small></div>
      {savedPlans.length > 0 && <label className="scenario-search">
        <Search aria-hidden="true" />
        <Input value={scenarioSearch} onChange={(event) => setScenarioSearch(event.target.value)} placeholder="Search saved scenarios" aria-label="Search saved scenarios" />
      </label>}
      {savedPlans.length === 0 && <p className="empty-scenario-note">No saved answers yet. Try one change, then save the result.</p>}
      {savedPlans.length > 0 && filteredSavedPlans.length === 0 && <p className="empty-scenario-note">No matching scenarios. Try the name, pressure type, or load percent.</p>}
      {filteredSavedPlans.map((plan) => {
        const planStatus = loadStatus(plan.projectedLoad);
        const dominantLabel = plan.dominantDimension ? dimensionLabels[plan.dominantDimension] : 'Load';
        return <article className="saved-scenario-card" key={plan.id}>
          <button type="button" className="saved-scenario-main" onClick={() => openSavedScenario(plan)}>
            <Save />
            <span><strong>{plan.title}</strong><small>Saved {plan.savedAt} · {dominantLabel} pressure</small></span>
            <em className={`risk-pill ${planStatus.tone}`}>{plan.projectedLoad}% {plan.statusLabel ?? planStatus.label}</em>
          </button>
          <button type="button" className="saved-scenario-delete" aria-label={`Delete ${plan.title}`} onClick={() => deleteScenario(plan.id)}><Trash2 /></button>
        </article>;
      })}
      <button type="button" onClick={startCustomScenario}><Plus /><span>Start from blank</span></button>
    </section>
    <section className="editorial-section scenario-templates" aria-labelledby="template-title">
      <div className="section-title"><div><h2 id="template-title">Quick tries</h2></div></div>
      {scenarioTemplates.map((card) => <button type="button" key={card.title} onClick={() => openTemplate(card)}>
        <WandSparkles />
        <span><strong>{card.title}</strong><small>{card.note}</small></span>
      </button>)}
    </section>
  </div>;
}
