/** Orders are counted by the kitchen's day in India, whatever time zone the server runs in. */
const TZ = "Asia/Kolkata";

export const istDay = (d: Date | string): string => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
export const isToday = (d: Date | string): boolean => istDay(d) === istDay(new Date());

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("en-IN", { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const formatTime = (iso: string): string => new Date(iso).toLocaleTimeString("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
