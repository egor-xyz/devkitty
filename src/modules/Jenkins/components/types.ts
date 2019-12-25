export interface RunParam {
  name: string;
  description: string;
  _class: string,
  defValue: string,
  value?: string
  warningMessage?: string;
  readonly?: boolean;
}

export type RunParams = RunParam[]