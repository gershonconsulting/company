// Build-time constants. The values are injected from package.json via
// next.config.ts using `env`. NEXT_PUBLIC_* prefix exposes them to the client.

export const APP_VERSION  = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const APP_BUILT_AT = process.env.NEXT_PUBLIC_APP_BUILT_AT ?? "";

// "Last release" date — date only, formatted per the Gershon.AI Left Sidebar
// Design Standard. Renders identical on server (UTC) and client because the
// timezone is pinned to America/New_York.
export function releaseDate(): string {
  if (!APP_BUILT_AT) return "";
  const d = new Date(APP_BUILT_AT);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year:     "numeric",
    month:    "short",
    day:      "numeric",
    timeZone: "America/New_York",
  });
}

export const RELEASE_DATE = releaseDate();
