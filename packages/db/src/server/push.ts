import webpush from "web-push";
import { getRepo } from "./index";

let ready: boolean | undefined;

function configure(): boolean {
  if (ready !== undefined) return ready;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (ready = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:owner@example.com", pub, priv);
  return (ready = true);
}

export const pushConfigured = (): boolean => configure();

/** Fire-and-forget Web Push. Silently does nothing until VAPID keys are set. */
export async function sendPushToUser(userId: string, msg: { title: string; body: string; url: string }): Promise<void> {
  if (!configure()) return;
  const repo = getRepo();
  const subs = await repo.listPushSubs(userId);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(msg));
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await repo.removePushSub(s.endpoint);
      }
    }),
  );
}
