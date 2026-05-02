import { NextResponse } from "next/server";

import { incrementZipDownloadCount } from "@/lib/db/metrics";

export const runtime = "nodejs";

type Params = { slug: string };

export async function POST(
  _req: Request,
  ctx: { params: Promise<Params> },
): Promise<Response> {
  const { slug } = await ctx.params;
  await incrementZipDownloadCount(slug);
  return NextResponse.json({ ok: true });
}
