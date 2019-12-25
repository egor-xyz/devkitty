export interface Parameter {
  _class: string;
  _original?: any;
  name: string;
  value: string;
}

export interface ParameterDefinitions {
  _class: string;
  defaultParameterValue: Parameter;
  description: string;
  name: string;
  type: string;
  value: string;
}

export interface BuildParameter {
  id?: string;
  name?: string;
  parameters: Parameter[];
}