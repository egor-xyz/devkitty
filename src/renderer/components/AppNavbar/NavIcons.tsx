import { type CSSProperties, type FC } from 'react';
import { cn } from 'renderer/utils/cn';

type IconProps = { className?: string; size?: number; style?: CSSProperties };

// `block` drops the inline-baseline gap so every custom glyph sits at the same
// height as the Blueprint / ClaudeMark icons beside it in the navbar row.
const base = 'block shrink-0';

// "Always on top" pushpin — the same straight-down pin macOS apps use for
// pin-to-top. Stroke weight matches the gear so the row reads as one set.
// currentColor lets the button (or an inline color style) tint it: grey when
// off, accent when armed.
export const PinIcon: FC<IconProps> = ({ className, size = 16, style }) => (
  <svg
    className={cn(base, className)}
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.6}
    style={style}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);

// Apple-style settings gear: rounded teeth, hollow center. currentColor so it
// tints from the button like a Blueprint icon.
export const SettingsGearIcon: FC<IconProps> = ({ className, size = 16, style }) => (
  <svg
    className={cn(base, className)}
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.6}
    style={style}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);
