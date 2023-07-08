export interface FoundEditor {
  readonly editor: string;
  readonly path: string;
  readonly usesShell?: boolean;
}

export type LaunchEditor = { editor: FoundEditor; fullPath: string };

interface IErrorMetadata {
  /** The error dialog should direct the user to open Preferences */
  openPreferences?: boolean;

  /** The error dialog should link off to the default editor's website */
  suggestDefaultEditor?: boolean;
}

export class ExternalEditorError extends Error {
  /** The error's metadata. */
  public readonly metadata: IErrorMetadata;

  public constructor(message: string, metadata: IErrorMetadata = {}) {
    super(message);

    this.metadata = metadata;
  }
}
