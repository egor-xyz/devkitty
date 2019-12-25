export const supportedHosters = ['github', 'bitbucket', 'gitlab'];

export const isSupportedHoster = (resource: string) => supportedHosters.includes(resource);