"use client";
import { useState, useTransition } from "react";
import type { Category } from "@blip/db";
import { Switch, useToast } from "@blip/ui";
import { deleteCategoryAction, reorderCategoriesAction, saveCategoryAction } from "@/app/actions";

function Row({ c, counts, index, last, onMove, drag }: { c: Category; counts: number; index: number; last: boolean; onMove: (dir: -1 | 1) => void; drag: Record<string, unknown> }) {
  const toast = useToast();
  const [name, setName] = useState(c.name);
  const [emoji, setEmoji] = useState(c.emoji);
  const [visible, setVisible] = useState(c.isVisible);
  const [pending, start] = useTransition();
  const dirty = name !== c.name || emoji !== c.emoji;

  const save = (patch: Partial<{ isVisible: boolean }> = {}) =>
    start(async () => {
      const res = await saveCategoryAction({ id: c.id, name, emoji, isVisible: patch.isVisible ?? visible });
      toast(res.ok ? "Saved" : res.error);
    });

  return (
    <div className="trow" style={{ ["--cols" as string]: "28px 64px minmax(0,1fr) 90px 100px auto", ["--cols-m" as string]: "28px 54px minmax(0,1fr) auto" }} {...drag}>
      <span className="drag" aria-hidden="true" title="Drag to reorder">⋮⋮</span>
      <input value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label={`Emoji for ${c.name}`} maxLength={8} style={{ width: 52, minHeight: 44, border: "1px solid var(--line)", background: "var(--bg)", borderRadius: 10, textAlign: "center", fontSize: 20 }} />
      <span style={{ minWidth: 0 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Category name" maxLength={40} style={{ width: "100%", minHeight: 44, border: "1px solid var(--line)", background: "var(--bg)", borderRadius: 10, padding: "0 12px" }} />
        <span className="sub">{counts} {counts === 1 ? "dish" : "dishes"}</span>
      </span>
      <span className="hide-m" style={{ display: "flex", gap: 6 }}>
        <button type="button" className="ib" aria-label={`Move ${c.name} up`} disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
        <button type="button" className="ib" aria-label={`Move ${c.name} down`} disabled={last} onClick={() => onMove(1)}>↓</button>
      </span>
      <span className="sw-inline hide-m"><Switch checked={visible} onCheckedChange={(v) => (setVisible(v), save({ isVisible: v }))} label={`${c.name} visible`} /><small style={{ color: "var(--mute)" }}>{visible ? "Shown" : "Hidden"}</small></span>
      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {dirty ? <button type="button" className="btn sm primary" onClick={() => save()} disabled={pending}>Save</button> : null}
        <button
          type="button"
          className="btn sm ghost"
          disabled={pending || counts > 0}
          title={counts > 0 ? "Move or delete its dishes first" : "Delete category"}
          onClick={() => window.confirm(`Delete ${c.name}?`) && start(async () => { const r = await deleteCategoryAction(c.id); toast(r.ok ? "Category deleted" : r.error); })}
        >
          Delete
        </button>
      </span>
    </div>
  );
}

export function CategoriesView({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const toast = useToast();
  const [list, setList] = useState(categories);
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [, start] = useTransition();
  const [fresh, setFresh] = useState({ name: "", emoji: "🍽️" });
  const [adding, startAdd] = useTransition();

  const commit = (next: Category[]) => {
    setList(next);
    start(async () => {
      await reorderCategoriesAction(next.map((c) => c.id));
      toast("Order saved");
    });
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j]!, next[i]!];
    commit(next);
  };

  return (
    <>
      <p className="hint" style={{ marginTop: 0 }}>Drag the handle (or use the arrows) to set the order customers see. Hidden categories disappear from the menu.</p>
      <section className="panel" aria-label="Categories">
        {list.map((c, i) => (
          <div key={c.id} className={over === i && from !== null && from !== i ? "dropline" : ""}>
            <Row
              c={c}
              counts={counts[c.id] ?? 0}
              index={i}
              last={i === list.length - 1}
              onMove={(d) => move(i, d)}
              drag={{
                draggable: true,
                onDragStart: () => setFrom(i),
                onDragOver: (e: React.DragEvent) => (e.preventDefault(), setOver(i)),
                onDragEnd: () => (setFrom(null), setOver(null)),
                onDrop: () => {
                  if (from === null || from === i) return;
                  const next = [...list];
                  const [m] = next.splice(from, 1);
                  next.splice(i, 0, m!);
                  setFrom(null);
                  setOver(null);
                  commit(next);
                },
              }}
            />
          </div>
        ))}
      </section>

      <form
        className="panel mt"
        onSubmit={(e) => {
          e.preventDefault();
          startAdd(async () => {
            const res = await saveCategoryAction({ name: fresh.name, emoji: fresh.emoji, isVisible: true });
            if (!res.ok) return toast(res.error);
            setFresh({ name: "", emoji: "🍽️" });
            toast("Category added");
            location.reload();
          });
        }}
      >
        <h2 className="panel-h">Add a category</h2>
        <div className="panel-b" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="field" style={{ marginTop: 0, width: 90 }}>
            <span>Emoji</span>
            <input value={fresh.emoji} onChange={(e) => setFresh({ ...fresh, emoji: e.target.value })} maxLength={8} />
          </label>
          <label className="field" style={{ marginTop: 0, flex: 1, minWidth: 200 }}>
            <span>Name</span>
            <input value={fresh.name} onChange={(e) => setFresh({ ...fresh, name: e.target.value })} required maxLength={40} placeholder="Sides, Drinks…" />
          </label>
          <button type="submit" className="btn primary" disabled={adding}>Add</button>
        </div>
      </form>
    </>
  );
}
