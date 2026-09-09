import { Tooltip } from '@blueprintjs/core';
import { cn } from 'renderer/utils/cn';
import { type AIAccount } from 'types/aiUsage';

type Props = {
  accounts: AIAccount[];
  activeDir?: string;
  onSelect: (dir: string) => void;
};

export const AccountPills = ({ accounts, activeDir, onSelect }: Props) => {
  if (accounts.length < 2) return null;
  return (
    <div className="scrollbar-none flex max-w-32 shrink-0 items-center gap-1 overflow-x-auto rounded-lg bg-black/5 p-0.5 dark:bg-white/5">
      {accounts.map((account, i) => (
        <Tooltip
          content={[account.org ?? account.label, account.email, account.plan].filter(Boolean).join(' · ')}
          hoverOpenDelay={500}
          key={account.dir}
          placement="top"
        >
          <button
            aria-label={`${account.provider === 'claude' ? 'Claude' : 'Codex'} account ${i + 1}: ${account.email ?? account.label}`}
            aria-pressed={account.dir === activeDir}
            className={cn(
              'app-region-no-drag flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
              account.dir === activeDir
                ? 'bg-white text-bp-dark-gray-1 shadow-sm ring-1 ring-black/10 dark:bg-white/20 dark:text-white dark:ring-white/20'
                : 'text-bp-gray-1 hover:bg-black/5 dark:text-bp-gray-4 dark:hover:bg-white/10'
            )}
            onClick={() => onSelect(account.dir)}
            type="button"
          >
            {i + 1}
          </button>
        </Tooltip>
      ))}
    </div>
  );
};
