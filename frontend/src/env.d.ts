// Typings for Vite import.meta.env used in the frontend

/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_TIMEOUT?: string;
  // add other VITE_* variables here as needed
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}