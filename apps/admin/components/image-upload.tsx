"use client";
import { useState } from "react";

/** Picks a file, uploads it for resizing, and reports the stored URL. */
export function ImageUpload({ value, onChange, label = "Photo", hint = "JPG, PNG or WebP. Resized to 1200px automatically." }: { value: string | null; onChange: (url: string | null) => void; label?: string; hint?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field">
      <span>{label}</span>
      <div className="upl">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt="" /> : null}
          <div>{busy ? "Uploading…" : value ? "Replace photo" : "Tap to choose a photo"}</div>
          <small style={{ color: "var(--mute)" }}>{hint}</small>
        </div>
        <input type="file" accept="image/png,image/jpeg,image/webp" aria-label={label} disabled={busy} onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
      </div>
      {value ? <button type="button" className="link" style={{ fontWeight: 400, fontSize: 14 }} onClick={() => onChange(null)}>Remove photo</button> : null}
      {error ? <p className="err" role="alert">{error}</p> : null}
    </div>
  );
}
