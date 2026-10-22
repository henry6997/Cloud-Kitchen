import { DishSkeletons } from "@/components/dish-card";

export default function Loading() {
  return (
    <main className="app app--home" aria-busy="true">
      <header className="top">
        <div className="loc"><small>Deliver to</small><span className="addr">&nbsp;</span></div>
        <span className="ib" />
      </header>
      <div className="grid" style={{ marginTop: 28 }}>
        <DishSkeletons />
      </div>
    </main>
  );
}
