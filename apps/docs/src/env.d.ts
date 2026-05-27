/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />
/// <reference types="@webgpu/types" />

declare module '*.wgsl?raw' {
  const content: string;
  export default content;
}

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  BETTER_AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  UNSUBSCRIBE_HMAC_SECRET?: string;
  PUBLIC_SITE_URL: string;
}

declare module 'cloudflare:workers' {
  export const env: Env;
}
