import { JenkinsJob } from 'modules/Jenkins/models';

export interface RunningBuild {
  buildId?: string | number;
  id: string;
  jobId: string;
  queueUrl?: string;
  timestamp: number;
}
export type RunningBuilds = RunningBuild[];

export interface JenkinsServer {
  domain: string;
  id: string;
  name: string;
  token: string;
  user: string;
}
export type JenkinsServers = JenkinsServer[];

export interface JenkinsStoreState {
  isActive: boolean;
  jobs: JenkinsJob[];
  runningBuilds: RunningBuilds;
  servers: JenkinsServers;
}