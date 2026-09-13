// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@blueprintjs/core', () => ({
  Icon: (): null => null,
  Popover: ({ children, content }: { children: ReactNode; content: ReactNode }) => <div>{children}{content}</div>
}));

import { SpendMeter, UsageMeter } from './UsageMeter';

describe('UsageMeter', () => {
  beforeEach(() => vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList));

  it('keeps the quota period separate from local trailing token history', () => {
    render(<UsageMeter metric={{
      id: 'seven-day', label: '7D', models: [
        { model: 'gpt-5.6-luna', tokens: 222_100 }, { model: 'gpt-5.6-sol', tokens: 94_400_000 },
        { model: 'codex-auto-review', tokens: 2_300_000 }, { model: 'gpt-5.6-terra', tokens: 5_400_000 }
      ], percent: 0.04, resetsAt: 605_800_000, scope: 'account', source: 'provider', title: '7D', tokens: 102_322_100, tokensPeriod: 'provider-period'
    }}
      now={1_000_000}
      provider="codex"
      reportedAt={940_000}
           />);

    expect(screen.getByRole('button', { name: '7D: 4% of current quota period' })).toBeDefined();
    expect(screen.getByText(/Current quota period/)).toBeDefined();
    expect(screen.getByText('Local tokens in this quota period')).toBeDefined();
    expect(screen.getByText('Local log tokens can miss use on other machines. They are not billed spend and do not match the quota percent.')).toBeDefined();
    expect(screen.getByText('102.3M')).toBeDefined();
    const modelList = screen.getByText('gpt-5.6-sol').parentElement?.parentElement;
    expect(modelList).not.toBeNull();
    expect(within(modelList!).getAllByText(/^(gpt-|codex-)/).map((row) => row.textContent)).toEqual([
      'gpt-5.6-sol', 'gpt-5.6-terra', 'codex-auto-review', 'gpt-5.6-luna'
    ]);
  });

  it('does not draw a fake quota bar when only local tokens exist', () => {
    render(<UsageMeter metric={{ id: 'five-hour', label: '5H · Quota unavailable', scope: 'account', source: 'local', title: '5H', tokens: 1200, tokensPeriod: 'trailing-window' }}
      now={1}
      provider="claude"
           />);
    expect(screen.getByRole('button', { name: '5H: quota unavailable, 1.2K tokens' })).toBeDefined();
    expect(screen.getAllByText('Quota unavailable').length).toBeGreaterThan(0);
    expect(screen.getByText('Local token history for the last 5 hours')).toBeDefined();
  });

  it('shows spend once and draws a bar only with an exact limit', () => {
    const { rerender } = render(<SpendMeter spend={{ amountUsdMicros: 5_000_000, label: 'Org API spend', period: 'calendar-month', scope: 'organization', source: 'admin' }} />);
    expect(screen.getByRole('button', { name: 'Org API spend: $5.00' })).toBeDefined();
    expect(screen.queryByText('of $')).toBeNull();
    rerender(<SpendMeter spend={{ amountUsdMicros: 5_000_000, label: 'On-demand', limitUsdMicros: 20_000_000, period: 'billing-cycle', qualifier: 'Shared by Cursor and Grok Bot.', scope: 'account', source: 'provider' }} />);
    expect(screen.getByRole('button', { name: 'On-demand: $5.00 of $20.00' })).toBeDefined();
    expect(screen.getByText('Shared by Cursor and Grok Bot.')).toBeDefined();
  });
});
