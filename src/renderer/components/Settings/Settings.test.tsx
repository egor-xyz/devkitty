// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('renderer/hooks/useAppSettings', () => ({ useIsSunset: () => false }));
vi.mock('../SettingsAppearance', () => ({ SettingsAppearance: () => <h2>Appearance settings</h2> }));
vi.mock('../SettingsUpdates', () => ({ SettingsUpdates: () => <h2>Updates settings</h2> }));
vi.mock('../SettingsIntegrations', () => ({ SettingsIntegrations: () => <h2>Integrations settings</h2> }));
vi.mock('../SettingsActions', () => ({ SettingsActions: () => <h2>GitHub settings</h2> }));
vi.mock('../SettingsDeveloper', () => ({ SettingsDeveloper: () => <h2>Developer settings</h2> }));

import { Settings } from './Settings';

const CurrentPath = () => {
  const location = useLocation();
  return <output data-testid="path">{location.pathname}</output>;
};

const renderSettings = (path = '/settings') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route element={<><Settings /><CurrentPath /></>}
        path="/settings/:id?"
      />

      <Route element={<CurrentPath />}
        path="/"
      />
    </Routes>
  </MemoryRouter>
);

describe('Settings page', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal('bridge', { settings: { getVersion: vi.fn().mockResolvedValue('4.5.0') } });
  });

  it('shows the installed version after the section links', async () => {
    const { container } = renderSettings();
    const nav = screen.getByRole('navigation', { name: 'Settings sections' });

    expect(await within(nav).findByText('4.5.0')).toBeTruthy();
    expect(container.querySelector('.settings-sidebar')?.lastElementChild?.textContent).toBe('4.5.0');
    expect(window.bridge.settings.getVersion).toHaveBeenCalledTimes(1);
  });

  it('hides the version when the request fails', async () => {
    vi.stubGlobal('bridge', { settings: { getVersion: vi.fn().mockRejectedValue(new Error('IPC failed')) } });
    renderSettings();

    await act(async () => { await Promise.resolve(); });
    expect(document.querySelector('.settings-version')?.textContent).toBe('');
    expect(screen.queryByText(/IPC failed/)).toBeNull();
  });

  it('shows one page with every section and Developer last in dev', () => {
    const { container } = renderSettings();
    const sectionLabels = [...container.querySelectorAll('.settings-section')].map((section) => section.getAttribute('aria-label'));

    expect(sectionLabels).toEqual(['Appearance', 'Updates', 'Integrations', 'GitHub', 'Developer']);
    expect(container.querySelectorAll('.settings-content')).toHaveLength(1);
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Close settings' })).toBeTruthy();
  });

  it('updates the route and scrolls when a section link is used', () => {
    renderSettings();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Settings sections' })).getByRole('button', { name: 'Updates' }));

    expect(screen.getByTestId('path').textContent).toBe('/settings/updates');
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('keeps a clicked short section active through its jump, then tracks manual scrolling', () => {
    renderSettings();
    const main = screen.getByRole('main', { name: 'Settings' });
    Object.defineProperties(main, {
      clientHeight: { configurable: true, value: 600 },
      scrollHeight: { configurable: true, value: 1000 }
    });

    fireEvent.click(screen.getByRole('button', { name: 'GitHub' }));
    expect(screen.getByRole('button', { name: 'GitHub' }).getAttribute('aria-current')).toBe('location');
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1);

    main.scrollTop = 400;
    fireEvent.scroll(main);
    fireEvent.scroll(main);
    expect(screen.getByRole('button', { name: 'GitHub' }).getAttribute('aria-current')).toBe('location');

    fireEvent.wheel(main);
    fireEvent.scroll(main);
    expect(screen.getByRole('button', { name: 'Developer' }).getAttribute('aria-current')).toBe('location');
  });

  it('scrolls again when the active category is clicked', () => {
    renderSettings('/settings/updates');
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Updates' }));
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('path').textContent).toBe('/settings/updates');
  });

  it('opens existing deep links at their section', () => {
    renderSettings('/settings/github');
    expect(screen.getByTestId('path').textContent).toBe('/settings/github');
    expect(screen.getByRole('button', { name: 'GitHub' }).getAttribute('aria-current')).toBe('location');
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('opens removed section links safely at the top', () => {
    renderSettings('/settings/git');
    expect(screen.getByTestId('path').textContent).toBe('/settings/git');
    expect(screen.getByRole('button', { name: 'Appearance' }).getAttribute('aria-current')).toBe('location');
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('keeps Updates active when its heading is near the top after deep-link scroll', () => {
    const { container } = renderSettings('/settings/updates');
    const main = screen.getByRole('main', { name: 'Settings' });
    Object.defineProperties(main, {
      clientHeight: { configurable: true, value: 600 },
      scrollHeight: { configurable: true, value: 1800 }
    });
    main.getBoundingClientRect = vi.fn(() => ({ top: 150 }) as DOMRect);
    const sectionTops = [-400, 230, 800, 1300, 1600];
    [...container.querySelectorAll<HTMLElement>('.settings-section')].forEach((section, index) => {
      section.getBoundingClientRect = vi.fn(() => ({ top: sectionTops[index] }) as DOMRect);
    });

    main.scrollTop = 350;
    fireEvent.scroll(main);
    expect(screen.getByRole('button', { name: 'Updates' }).getAttribute('aria-current')).toBe('location');
  });

  it('keeps a tall section active until the next heading reaches the top band', () => {
    const { container } = renderSettings();
    const main = screen.getByRole('main', { name: 'Settings' });
    Object.defineProperties(main, {
      clientHeight: { configurable: true, value: 600 },
      scrollHeight: { configurable: true, value: 2400 }
    });
    main.getBoundingClientRect = vi.fn(() => ({ top: 0 }) as DOMRect);
    const sectionTops = [-900, -700, -400, 300, 1200];
    [...container.querySelectorAll<HTMLElement>('.settings-section')].forEach((section, index) => {
      section.getBoundingClientRect = vi.fn(() => ({ top: sectionTops[index] }) as DOMRect);
    });

    main.scrollTop = 1000;
    fireEvent.scroll(main);
    expect(screen.getByRole('button', { name: 'Integrations' }).getAttribute('aria-current')).toBe('location');

    sectionTops[3] = 110;
    fireEvent.scroll(main);
    expect(screen.getByRole('button', { name: 'GitHub' }).getAttribute('aria-current')).toBe('location');
  });

  it('tracks the section in the left list as the page scrolls', () => {
    const { container } = renderSettings();
    const main = screen.getByRole('main', { name: 'Settings' });
    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    Object.defineProperties(main, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1400 }
    });
    main.getBoundingClientRect = vi.fn(() => ({ top: 0 }) as DOMRect);
    const sectionTops = [20, -100, 25, 350, 600];
    [...container.querySelectorAll<HTMLElement>('.settings-section')].forEach((section, index) => {
      section.getBoundingClientRect = vi.fn(() => ({ top: sectionTops[index] }) as DOMRect);
    });

    main.scrollTop = 250;
    fireEvent.scroll(main);
    expect(within(nav).getByRole('button', { name: 'Integrations' }).getAttribute('aria-current')).toBe('location');

    main.scrollTop = 1100;
    fireEvent.scroll(main);
    expect(within(nav).getByRole('button', { name: 'Developer' }).getAttribute('aria-current')).toBe('location');

  });
});
