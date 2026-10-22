import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireOwner, storeImage } from "@blip/db/server";

export const runtime = "nodejs";
const MAX_BYTES = 8 * 1024 * 1024;

/** Owner uploads: validated, auto-rotated, resized to 1200px wide and stored as WebP. */
export async function POST(req: Request) {
  try {
    await requireOwner();
  } catch {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
  if (!/^image\/(png|jpe?g|webp|gif|avif)$/.test(file.type)) return NextResponse.json({ error: "Use a JPG, PNG or WebP image" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is over 8 MB" }, { status: 400 });
  try {
    const webp = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return NextResponse.json({ url: await storeImage(webp) });
  } catch {
    return NextResponse.json({ error: "Couldn't read that image" }, { status: 400 });
  }
}
