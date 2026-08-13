/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API origin in production (e.g. https://api.example.com). Empty in dev → Vite proxy. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
