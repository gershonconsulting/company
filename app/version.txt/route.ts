import { APP_VERSION } from "@/lib/version";

export const runtime = "edge";

// Public, unauthenticated: plain-text version only (the same constant the
// login footer and sidebar show). Lets us check "merged but live?" from outside.
// middleware.ts already skips *.txt paths.
export async function GET() {
  return new Response(APP_VERSION + "\n", {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
