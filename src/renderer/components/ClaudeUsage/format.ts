// Semantic fill for a usage meter: calm while there is headroom, amber as it
// tightens, red when it is nearly spent. Thresholds are the point of the gauge,
// so they live here rather than scattered in the view.
export const meterColor = (pct: number): string => {
  if (pct >= 0.85) return '#CD4246'; // Blueprint danger
  if (pct >= 0.6) return '#C87619'; // Blueprint warning
  return '#238551'; // Blueprint success
};

export const formatTokens = (n: number): string => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};

// Compact "time remaining" for a reset countdown: the two largest non-zero
// units, coarsening as the horizon grows (days for weekly, minutes for 5h).
export const formatCountdown = (ms: number): string => {
  if (ms <= 0) return 'now';

  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) {
    const remHours = hours - days * 24;
    return remHours ? `${days}d ${remHours}h` : `${days}d`;
  }

  if (hours >= 1) {
    const remMinutes = minutes - hours * 60;
    return remMinutes ? `${hours}h ${remMinutes}m` : `${hours}h`;
  }

  return minutes >= 1 ? `${minutes}m` : '<1m';
};

export type CountdownPart = { unit: string; value: number };

// Structured form of the countdown so each number can animate independently.
// null → already reset ("now"); [] → under a minute ("<1m"); otherwise the two
// largest non-zero units, matching formatCountdown.
export const countdownParts = (ms: number): CountdownPart[] | null => {
  if (ms <= 0) return null;

  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) {
    const remHours = hours - days * 24;
    return remHours ? [{ unit: 'd', value: days }, { unit: 'h', value: remHours }] : [{ unit: 'd', value: days }];
  }

  if (hours >= 1) {
    const remMinutes = minutes - hours * 60;
    return remMinutes ? [{ unit: 'h', value: hours }, { unit: 'm', value: remMinutes }] : [{ unit: 'h', value: hours }];
  }

  return minutes >= 1 ? [{ unit: 'm', value: minutes }] : [];
};

const MODEL_LABELS: Record<string, string> = {
  'claude-fable-5': 'Fable',
  'claude-haiku-4-5': 'Haiku',
  'claude-opus-4-8': 'Opus 4.8',
  'claude-opus-5': 'Opus 5',
  'claude-sonnet-4-6': 'Sonnet'
};

// Turn a raw model id into something readable, tolerating dated ids like
// "claude-haiku-4-5-20251001" by matching the longest known prefix.
export const modelLabel = (model: string): string => {
  if (MODEL_LABELS[model]) return MODEL_LABELS[model];

  const [match] = Object.keys(MODEL_LABELS)
    .filter((key) => model.startsWith(key))
    .sort((a, b) => b.length - a.length);

  return match ? MODEL_LABELS[match] : model.replace(/^claude-/, '');
};
