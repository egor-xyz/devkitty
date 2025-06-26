export type FoundShell<T> = {
  readonly extraArgs?: string[];
  readonly path: string;
  readonly shell: T;
}

export type LaunchShell = { fullPath: string; shell: FoundShell<string> };
