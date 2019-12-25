import { Parameter } from 'modules/Jenkins/models/Parameter';

export interface JenkinsBuild {
  _class?: string;
  building?: boolean;
  displayName?: string;
  duration?: number;
  estimatedDuration?: number;
  fullDisplayName?: string;
  id?: string;
  number?: number;
  // custom
  parameters?: Parameter[],
  result?: string;
  timestamp?: number;
  url?: string;
}

export const pickJenkinsBuildFields = [
  '_class',
  'building',
  'displayName',
  'duration',
  'estimatedDuration',
  'fullDisplayName',
  'id',
  'number',
  'result',
  'timestamp',
  'url',
  'parameters',
];