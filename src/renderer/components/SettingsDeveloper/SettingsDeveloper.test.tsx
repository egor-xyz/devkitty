// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SettingsDeveloper } from './SettingsDeveloper';

describe('Developer settings', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads the saved demo mode and changes the startup flag', () => {
    const values = new Map([['dk-demo', '1']]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });

    render(<SettingsDeveloper />);
    const demo = screen.getByRole('checkbox', { name: /Demo mode/ });
    expect((demo as HTMLInputElement).checked).toBe(true);
    fireEvent.click(demo);
    expect(values.get('dk-demo')).toBe('0');
    expect(reload).toHaveBeenCalledOnce();
  });
});
