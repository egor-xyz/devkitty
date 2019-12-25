import { Group } from 'models';

import { BuildParameter, ParameterDefinitions } from './Parameter';

export interface JenkinsJob {
  _class?: string;
  // Custom fields
  buildParameterId?: string;
  buildParameters?: BuildParameter[];
  buildable?: boolean;
  color?: string;
  description?: string | null;
  displayName?: string;
  firstBuild?: {
    _class: string;
    number: number;
    url: string;
  },
  fullDisplayName?: string;
  group?: Group;
  id?: string;
  lastBuild?: {
    _class: string;
    number: number;
    url: string;
  };
  lastSuccessfulBuild?: {
    _class: string;
    number: number;
    url: string;
  };
  name?: string;
  nextBuildNumber?: number;
  parameterDefinitions?: ParameterDefinitions[];
  queueItem?: any;
  serverId?: string;
  timestamp?: number;
  url?: string;
}

export const pickJenkinsJobFields = [
  '_class',
  'buildable',
  'color',
  'parameterDefinitions',
  'description',
  'displayName',
  'firstBuild',
  'fullDisplayName',
  'lastSuccessfulBuild',
  'lastBuild',
  'name',
  'nextBuildNumber',
  'queueItem',
  'timestamp',
  'url',
];

