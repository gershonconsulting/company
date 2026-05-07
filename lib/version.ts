// Build-time constants. The values are injected from package.json via
// next.config.ts using `env`. NEXT_PUBLIC_* prefix exposes them to the client.
export const APP_VERSION  = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const APP_BUILT_AT = process.env.NEXT_PUBLIC_APP_BUILT_AT ?? "";
