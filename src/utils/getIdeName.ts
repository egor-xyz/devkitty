import path from 'path';

export const getIdeName = (IDE: string | undefined): string => {
  const nameIDE = IDE
    ? path.parse(IDE.replace(/\\/g, '/')).name ?? 'IDE'
    : 'IDE'
  ;
  return nameIDE.charAt(0).toUpperCase() + nameIDE.slice(1);
};