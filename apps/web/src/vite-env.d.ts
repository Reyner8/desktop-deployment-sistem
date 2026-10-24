/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Di-inject oleh vite.config.ts dari version package.json web.
declare const __APP_VERSION__: string;
