interface CloudflareEnv {
  SETTINGS: KVNamespace;
}

declare global {
  function getCloudflareContext<T = CloudflareEnv>(): { env: T };
}
