import ua from 'universal-analytics';

const cid = localStorage.getItem('cid');
export const visitor = ua('UA-156660517-2', { cid: cid || undefined });
localStorage.setItem('cid', (visitor as any).cid);

