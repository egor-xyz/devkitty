// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@blueprintjs/core', () => ({
  Icon: (): null => null,
  Popover: ({ children, content }: { children: ReactNode; content: ReactNode }) => <div>{children}{content}</div>
}));

import { UsageMeter } from './UsageMeter';

describe('UsageMeter', () => {
  beforeEach(() => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
  });

  it('labels reported Codex model totals as local and keeps all local rows sorted', () => {
    render(
      <UsageMeter
        label="7D"
        now={1_000_000}
        provider="codex"
        reportedAt={940_000}
        title="Codex · 7D usage"
        window={{
          active: true,
          cap: 0,
          models: [
            { model: 'gpt-5.6-luna', tokens: 222_100 },
            { model: 'gpt-5.6-sol', tokens: 94_400_000 },
            { model: 'codex-auto-review', tokens: 2_300_000 },
            { model: 'gpt-5.6-terra', tokens: 5_400_000 }
          ],
          pct: 0.49,
          reported: true,
          resetsAt: 605_800_000,
          startsAt: 1,
          tokens: 102_322_100
        }}
      />
    );

    expect(screen.getByText('Local by model')).toBeDefined();
    expect(screen.getByText('ran 102.3M locally')).toBeDefined();
    expect(screen.getByText('Quota can include use not recorded in local sessions.')).toBeDefined();
    expect(screen.queryByText('gpt-6-astra')).toBeNull();

    const modelList = screen.getByText('gpt-5.6-sol').parentElement?.parentElement;
    expect(modelList).not.toBeNull();
    expect(within(modelList as HTMLElement).getAllByText(/^(gpt-|codex-)/).map((row) => row.textContent)).toEqual([
      'gpt-5.6-sol',
      'gpt-5.6-terra',
      'codex-auto-review',
      'gpt-5.6-luna'
    ]);
  });
});
