export interface JenkinsJobServer {
  _class: string;
  color: string;
  name: string;
  url: string;
}

export interface GetAllJenkinsJobsResponse {
  jobs: JenkinsJobServer[];
}

export interface GetQueueResponse {
  id?: string;
  why?: string;
}