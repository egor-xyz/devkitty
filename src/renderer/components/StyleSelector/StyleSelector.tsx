import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { cn } from 'renderer/utils/cn';

const OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'sunset', label: 'Sunset' }
] as const;

export const StyleSelector = () => {
  const { set, theme } = useAppSettings();
  const active = theme ?? 'sunset';

  return (
    <div className="flex w-full flex-wrap justify-start gap-x-4 gap-y-3">
      {OPTIONS.map(({ key, label }) => (
        <button
          aria-pressed={active === key}
          className="flex flex-col items-center gap-1.5 rounded-lg p-1 text-center text-sm leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          key={key}
          onClick={() => set({ theme: key })}
          type="button"
        >
          {/* The card renders the theme's real window background so the choice
              reads at a glance: the Sunset gradient vs. the flat neutral. */}
          <div
            className={cn(
              'overflow-hidden rounded-xl w-[120px] h-[76px] border-3 border-transparent flex flex-col',
              key === 'sunset' ? 'dk-preview-sunset' : 'dk-preview-default',
              active === key && 'border-blue-500 ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent'
            )}
          >
            <div
              className={cn(
                'h-[20px] shrink-0',
                key === 'sunset'
                  ? 'bg-white/10 border-b border-white/10'
                  : 'bg-bp-light-gray-4 dark:bg-bp-dark-gray-1 border-b border-black/10 dark:border-white/10'
              )}
            />
          </div>

          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};
