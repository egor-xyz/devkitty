import { find, pick } from 'lodash';
import { stringify } from 'query-string';
import normalizeURL from 'normalize-url';

import { JenkinsServer } from 'modules/Jenkins/context';
import { getPassword } from 'utils';
import { requestServer } from 'api';

import { GetQueueResponse, JenkinsJobServer } from './types';
import { JenkinsBuild, JenkinsJob, pickJenkinsBuildFields, pickJenkinsJobFields } from '../models';
import { RunParams } from '../components/types';

const getHeaders = async (server: JenkinsServer, token?: string) => {
  if (token) return { 'Authorization': 'Basic ' + btoa(`${server.user}:${token}`) };
  const realToken = await getPassword(server.token);
  if (!realToken) return;
  return { 'Authorization': 'Basic ' + btoa(`${server.user}:${realToken}`) };
};

export const checkJenkinsCredentials = async (server: JenkinsServer, token?: string): Promise<boolean> => {
  const headers = await getHeaders(server, token);
  if (!headers) return false;
  const res = await requestServer('get', `${server.domain}/api/json`, null, { headers });
  return res.status === 200;
};

export const getJenkinsAllJobs = async (server: JenkinsServer): Promise<{
  jobs?: JenkinsJobServer[];
  success: boolean;
}> => {
  const headers = await getHeaders(server);
  if (!headers) return { success: false };
  const res = await requestServer('get', `${server.domain}/api/json`, null, { headers });
  if (res.status !== 200 || !res.data?.jobs) return { success: false };
  return {
    jobs: res.data?.jobs?.filter((job: any) => job.color !== 'disabled'),
    success: true
  };
};

export const getJenkinsJob = async (server: JenkinsServer, jobName: string): Promise<JenkinsJob | void> => {
  const headers = await getHeaders(server);
  if (!headers) return;

  const url = `${server.domain}/job/${jobName}/api/json`;
  const res = await requestServer('get', url, null, { headers });
  if (!res.data) return;

  // Parse job params
  let parameterDefinitions: JenkinsJob['parameterDefinitions'] = [];
  const property = find(res.data?.property, 'parameterDefinitions');
  if (property) parameterDefinitions = property.parameterDefinitions ?? [];
  res.data.parameterDefinitions = parameterDefinitions;

  return pick(res.data, pickJenkinsJobFields);
};

export const getJenkinsBuild = async (
  server: JenkinsServer,
  jobName: string,
  buildId: number | string = 'lastBuild'
): Promise<JenkinsBuild | void> => {
  const headers = await getHeaders(server);
  if (!headers) return;

  const url = `${server.domain}/job/${jobName}/${buildId}/api/json`;
  const res = await requestServer('get', url, null, { headers });
  if (!res.data) return;

  // Parse job params
  let parameters: JenkinsBuild['parameters'] = [];
  const parametersAction = find(res.data?.actions, 'parameters');
  if (parametersAction) parameters = parametersAction.parameters ?? [];
  res.data.parameters = parameters;

  return pick(res.data, pickJenkinsBuildFields);
};

export const startJenkinsJob = async (
  server: JenkinsServer,
  job: JenkinsJob,
  runParams: RunParams
): Promise<{
  queueURL?: string,
  success: boolean
}> => {
  const { name, buildable, buildParameterId, buildParameters } = job;
  if (!buildable || !buildParameters?.length || !buildParameterId) return { success: false };

  const params: any = {};
  runParams.forEach(({ name, value }) => params[name] = value);

  const url = normalizeURL(`${server.domain}/job/${name}/buildWithParameters?${stringify(params)}`);

  const headers = await getHeaders(server);
  if (!headers) return { success: false };

  const res = await requestServer('post', url, null, { headers });
  let locationUrl: string = res._origin?.headers.location;
  return {
    queueURL: locationUrl ? locationUrl + 'api/json' : undefined,
    success: res.status === 201,
  };
};

export const getQueue = async (server: JenkinsServer, url: string): Promise<GetQueueResponse> => {
  const headers = await getHeaders(server);
  if (!headers) return { why: 'Jenkins Token not found!' };
  const res = await requestServer('get', url, null, { headers });
  return {
    id: res.data?.executable?.number,
    why: res.data?.why
  };
};