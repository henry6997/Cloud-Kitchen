export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main className="app app--home">
      <div className="empty" style={{ paddingTop: 80 }}>
        <span className="glyph" aria-hidden="true">📡</span>
        <b>You're offline</b>
        The menu you last viewed is still available. Placing an order needs a connection.
      </div>
    </main>
  );
}
