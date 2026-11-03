/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SITE_URL: string;
  readonly PUBLIC_GA4_ID: string;
  readonly PUBLIC_CF_ANALYTICS_TOKEN: string;
  readonly FORMSPREE_FORM_ID: string;
  readonly FORMSPREE_CC_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
