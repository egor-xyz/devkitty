import { type Run } from 'types/gitHub';

export const formatDuration = (
  start?: null | string,
  end?: null | string,
  nowMs: number = Date.now()
): null | string => {
  if (!start) return null;

  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : nowMs;
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null;

  const totalSeconds = Math.floor((endMs - startMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

export const getRunDuration = (
  run: Pick<Run, 'conclusion' | 'created_at' | 'run_started_at' | 'updated_at'>,
  nowMs: number = Date.now()
): null | string => {
  const start = run.run_started_at ?? run.created_at;

  if (run.conclusion) {
    if (!run.updated_at) return null;
    return formatDuration(start, run.updated_at, nowMs);
  }

  return formatDuration(start, undefined, nowMs);
};
