import { cn } from 'renderer/utils/cn';

// Provider-neutral analytics mark shared by the navbar and usage footer.
export const ClaudeMark = ({ className, size = 14, spin = false }: { className?: string; size?: number; spin?: boolean }) => (
  <svg
    aria-hidden
    className={cn(spin && 'animate-pulse', className)}
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.8}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4 4v16h16M8 15v-4m5 4V7m5 8v-6" />
  </svg>
);
