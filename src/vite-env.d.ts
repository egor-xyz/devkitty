/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

type ImportMeta = {
  readonly env: ImportMetaEnv;
}

type ImportMetaEnv = {
  readonly VITE_PUBLIC_URL: string;
}
