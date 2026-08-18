export type HiddenEntry = {
  id: number;
  label: string;
};

export const hiddenRunsPrefix = 'hiddenActions:';
export const hiddenPullsPrefix = 'hiddenPulls:';

export const hiddenRunsKey = (projectId: string) => `${hiddenRunsPrefix}${projectId}`;
export const hiddenPullsKey = (projectId: string) => `${hiddenPullsPrefix}${projectId}`;

/**
 * Hidden items used to be stored as bare ids, which is enough to filter them
 * out but not to list them back. Entries now carry a label; a stored id with no
 * label still parses, so nothing hidden before the change gets stranded.
 */
export const parseHidden = (raw: null | string): HiddenEntry[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => (typeof item === 'number' ? { id: item, label: `#${item}` } : item))
      .filter((item): item is HiddenEntry => typeof item?.id === 'number')
      .map((item) => ({ id: item.id, label: item.label || `#${item.id}` }));
  } catch {
    return [];
  }
};

export const addHidden = (entries: HiddenEntry[], entry: HiddenEntry): HiddenEntry[] =>
  entries.some((item) => item.id === entry.id) ? entries : [...entries, entry];

export const removeHidden = (entries: HiddenEntry[], id: number): HiddenEntry[] =>
  entries.filter((entry) => entry.id !== id);

export const projectIdOf = (key: string) => key.replace(hiddenRunsPrefix, '').replace(hiddenPullsPrefix, '');
