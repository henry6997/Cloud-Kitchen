import { readDemoUpload } from "@blip/db/server";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const file = readDemoUpload(name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
}
