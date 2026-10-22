export default function Loading() {
  return (
    <main className="app app--menu" aria-busy="true">
      <div className="head"><div className="hrow"><h1>Orders</h1></div></div>
      {Array.from({ length: 3 }, (_, i) => <div key={i} className="sk-row" />)}
    </main>
  );
}
