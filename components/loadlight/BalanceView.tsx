'use client';

import { useState } from 'react';
import { ArrowRight, Check, Coffee, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { proposedCafeShift } from '@/lib/loadlight/demo-data';
import {
  balanceMoves,
  proposedShiftLoad,
  relocatedLoad,
  thursdayAfterWhatIf,
  thursdayBeforeLoad,
} from '@/lib/loadlight/load-logic';

export function BalanceView() {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const selectedPoints = balanceMoves.reduce(
    (total, move) => total + (selectedTaskIds.has(move.taskId) ? move.relocatedPoints : 0),
    0,
  );
  const remainingPoints = relocatedLoad - selectedPoints;
  const canApply = selectedPoints >= relocatedLoad;

  function toggleMove(taskId: string) {
    setSelectedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  return <div className="view-content balance-view">
    <header className="page-header"><p className="date-label">BALANCE</p><h1>Make a little room.</h1></header>

    <section className="balance-commitment" aria-labelledby="commitment-title">
      <span className="balance-icon" aria-hidden="true"><Coffee /></span>
      <div><span className="micro-label">NEW COMMITMENT</span><h2 id="commitment-title">{proposedCafeShift.title}</h2><p>Thursday <span aria-hidden="true">·</span> <strong>+{proposedShiftLoad} load</strong></p></div>
    </section>

    <section className="balance-consequence" aria-labelledby="consequence-title">
      <h2 id="consequence-title">Thursday load</h2>
      <div className="balance-loads" aria-label={`Thursday load changes from ${thursdayBeforeLoad} to ${thursdayAfterWhatIf} points`}>
        <div><span>Current</span><strong>{thursdayBeforeLoad}</strong></div>
        <ArrowRight aria-hidden="true" />
        <div className="what-if-total"><span>With shift</span><strong>{thursdayAfterWhatIf}</strong></div>
      </div>
      <p className="balance-needed"><strong>{relocatedLoad} points</strong><span>need to be moved</span></p>
    </section>

    <section className="balance-options" aria-labelledby="balance-options-title">
      <h2 id="balance-options-title">MAKE SOME ROOM</h2>
      <p className="balance-intro">Choose what to move from Thursday.</p>
      <div className="balance-move-list">
        {balanceMoves.map((move) => {
          const selected = selectedTaskIds.has(move.taskId);
          return <button
            key={move.taskId}
            type="button"
            className={`balance-move ${selected ? 'selected' : ''}`}
            aria-pressed={selected}
            onClick={() => toggleMove(move.taskId)}
          >
            <span className="balance-check" aria-hidden="true">{selected && <Check />}</span>
            <span className="balance-move-copy"><strong>{move.title}</strong><span className="balance-route">{move.fromDayLabel} <ArrowRight aria-hidden="true" /> {move.toDayLabel} <i aria-hidden="true">·</i> {move.relocatedPoints} points</span><small>{move.reason}</small></span>
          </button>;
        })}
      </div>
    </section>

    <section className="balance-action-area" aria-label="Balance plan summary">
      <div><strong>{selectedPoints} / {relocatedLoad} points moved</strong><span>{remainingPoints} points remaining</span></div>
      <Button className="primary-action" disabled={!canApply}><Scale /> Apply plan</Button>
      <p>This is a preview for now. Applying changes comes next.</p>
    </section>
  </div>;
}
