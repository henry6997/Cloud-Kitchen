import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { demoFile } from "./demo-repo";
import { supabaseConfigured } from "./session";

const uploadsDir = () => path.join(path.dirname(demoFile()), "uploads");
const SAFE = /^[a-z0-9-]+\.webp$/;

/** Saves an already-resized image. Supabase Storage in production, a local folder in demo mode. */
export async function storeImage(webp: Buffer): Promise<string> {
  const name = `${randomUUID()}.webp`;
  if (supabaseConfigured()) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { error } = await sb.storage.from("product-images").upload(name, webp, { contentType: "image/webp", cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    return sb.storage.from("product-images").getPublicUrl(name).data.publicUrl;
  }
  fs.mkdirSync(/*turbopackIgnore: true*/ uploadsDir(), { recursive: true });
  fs.writeFileSync(/*turbopackIgnore: true*/ path.join(uploadsDir(), name), webp);
  return `/media/${name}`;
}

/** Demo mode only: serves files saved by storeImage. */
export function readDemoUpload(name: string): Buffer | null {
  if (!SAFE.test(name)) return null;
  const file = path.join(uploadsDir(), name);
  return fs.existsSync(/*turbopackIgnore: true*/ file) ? fs.readFileSync(/*turbopackIgnore: true*/ file) : null;
}
