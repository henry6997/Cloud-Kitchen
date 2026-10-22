import type { ReactNode } from "react";

/** Product photo, or the emoji placeholder until the owner uploads one. */
export function Photo({ src, emoji, alt = "" }: { src: string | null; emoji: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={alt} loading="lazy" decoding="async" /> : <span aria-hidden="true">{emoji}</span>;
}

export function VegMark({ veg, className = "dt" }: { veg: boolean; className?: string }) {
  return <span className={`${className}${veg ? "" : " nv"}`} title={veg ? "Veg" : "Non-veg"} role="img" aria-label={veg ? "Veg" : "Non-veg"} />;
}

export function QtyStepper({ name, qty, onInc, onDec }: { name: string; qty: number; onInc: () => void; onDec: () => void }) {
  return (
    <div className="step" role="group" aria-label={`Quantity of ${name}`}>
      <button type="button" onClick={onDec} aria-label={`Remove one ${name}`}>−</button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={onInc} aria-label={`Add one ${name}`}>+</button>
    </div>
  );
}

export function Empty({ glyph, title, children }: { glyph?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {glyph ? <span className="glyph" aria-hidden="true">{glyph}</span> : null}
      <b>{title}</b>
      {children}
    </div>
  );
}

export function GoalBar({ pct, label, onCard = false }: { pct: number; label: string; onCard?: boolean }) {
  return (
    <>
      <div className={`goal${onCard ? " on-card" : ""}`} role="progressbar" aria-label="Progress to free delivery" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="goal-msg">{label}</div>
    </>
  );
}
