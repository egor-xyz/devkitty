import { Intent } from '@blueprintjs/core';

export const getJenkinsBuildIntent = (status?: string): Intent => {
  switch (status) {
    case 'SUCCESS': return 'success';
    case 'ABORTED': return 'warning';
    case 'ERROR': return 'danger';
    default: return 'none';
  }
};