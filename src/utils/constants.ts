export const SECRETS_SERVICE_NAME = 'Devkitty';
export const SECRETS_DEFAULT_JENKINS_TOKEN = 'default_jenkins_token';

export const getJenkinsServerTokenName = (id: string) => `${id}_jenkins_token`;
export const getJenkinsJobTokenName = (id: string) => `${id}_jenkins_token`;

export const getGithubAccessTokenName = (id: string) => `${id}_github_access_token`;