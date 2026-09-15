// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { MemoryRouter, type NavigateFunction, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAnalyticsPageView } from './useAnalyticsPageView';

const trackEvent = vi.fn().mockResolvedValue(undefined);
let navigate: NavigateFunction;

const Harness = () => {
  useAnalyticsPageView();
  navigate = useNavigate();
  return null;
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Harness />
    </MemoryRouter>
  );

const goTo = (path: string) => {
  act(() => navigate(path));
};

describe('useAnalyticsPageView', () => {
  beforeEach(() => {
    trackEvent.mockClear();
    Object.assign(window.bridge, { analytics: { trackEvent } });
  });

  it('sends the fixed Projects page on the first known route', () => {
    renderAt('/?project=private#file-path');

    expect(trackEvent).toHaveBeenCalledWith('page_view', {
      page_location: 'https://devkitty.app/app',
      page_title: 'Projects'
    });
  });

  it('sends the fixed Settings page without its route id', () => {
    renderAt('/settings/private-project-id?token=secret#file-path');

    expect(trackEvent).toHaveBeenCalledWith('page_view', {
      page_location: 'https://devkitty.app/app/settings',
      page_title: 'Settings'
    });
  });

  it('sends page views on known route changes', () => {
    renderAt('/');
    goTo('/settings');
    goTo('/settings/another-private-id');

    expect(trackEvent).toHaveBeenCalledTimes(3);
    expect(trackEvent).toHaveBeenLastCalledWith('page_view', {
      page_location: 'https://devkitty.app/app/settings',
      page_title: 'Settings'
    });
  });

  it('does not send unknown routes', () => {
    renderAt('/private/project/path');

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('does not send again when only query or hash values change', () => {
    renderAt('/?first=private#one');
    goTo('/?second=private#two');

    expect(trackEvent).toHaveBeenCalledTimes(1);
  });
});
