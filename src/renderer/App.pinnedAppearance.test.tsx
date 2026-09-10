// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('renderer/hooks/useAppSettings', (): object => ({
  useAppSettings: () => ({ claudeEnabled: false }),
  useIsSunset: () => false
}));
vi.mock('renderer/hooks/useDarkMode', (): object => ({ useDarkMode: () => ({ darkMode: false }) }));
vi.mock('renderer/hooks/useModal', (): object => ({ useModal: () => ({ Modal: (): null => null }) }));
vi.mock('./components/AppNavbar', (): object => ({ AppNavbar: (): null => null }));
vi.mock('./components/ClaudeUsage', (): object => ({ ClaudeFooter: (): null => null }));
vi.mock('./components/CommandPalette', (): object => ({ CommandPalette: (): null => null }));
vi.mock('./Routing', (): object => ({ Routing: (): null => null }));

import { App } from './App';

describe('App pinned glass state', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not apply renderer opacity or glass state', () => {
    const { container } = render(<App />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.hasAttribute('data-dk-pinned-glass')).toBe(false);
    expect(root.classList.contains('dk-pinned-glass-surface')).toBe(false);
    expect(document.documentElement.hasAttribute('data-dk-pinned-glass')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--dk-glass-opacity')).toBe('');
  });
});
