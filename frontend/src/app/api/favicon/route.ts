import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

/** Serves /public/vercel.svg for any leftover /api/favicon requests. */
export async function GET() {
  const filePath = path.join(process.cwd(), "public", "vercel.svg");
  const body = await readFile(filePath);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
