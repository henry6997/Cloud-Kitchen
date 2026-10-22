"use client";
import { useEffect, useState } from "react";

/** Renders in the viewer's own time zone after mount, so server and client never disagree. */
export function LocalTime({ iso, kind = "time" }: { iso: string; kind?: "time" | "date" | "datetime" }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    setText(kind === "time" ? time : kind === "date" ? date : `${date}, ${time}`);
  }, [iso, kind]);
  return <time dateTime={iso} suppressHydrationWarning>{text}</time>;
}
