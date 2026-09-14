// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { type UpdateState } from 'types/update';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdateAction, useUpdateAction } from './UpdateAction';

let onState: ((state: UpdateState) => void) | undefined;
const getState = vi.fn<() => Promise<UpdateState>>();
const download = vi.fn<() => Promise<void>>();
const install = vi.fn<() => Promise<void>>();
const unsubscribe = vi.fn();

beforeEach(() => {
  onState = undefined;
  getState.mockReset().mockResolvedValue({ status: 'idle' });
  download.mockReset().mockResolvedValue(undefined);
  install.mockReset().mockResolvedValue(undefined);
  unsubscribe.mockReset();
  window.bridge.updater = {
    download,
    getState,
    install,
    onState: vi.fn((callback: (state: UpdateState) => void) => {
      onState = callback;
      return unsubscribe;
    })
  };
});

const emitState = (state: UpdateState) => act(() => onState?.(state));

const TestAction = () => {
  const { run, state } = useUpdateAction();
  return (
    <UpdateAction
      run={run}
      state={state}
    />
  );
};

describe('UpdateAction', () => {
  it('hides idle and unknown-version errors', async () => {
    getState.mockResolvedValue({ error: 'No network', status: 'error' });
    const { result } = renderHook(useUpdateAction);

    await act(async () => { await getState.mock.results[0].value; });
    expect(result.current.visible).toBe(false);
    expect(result.current.state).toEqual({ error: 'No network', status: 'error' });

    const { rerender } = render(
      <UpdateAction
        run={vi.fn()}
        state={{ status: 'idle' }}
      />
    );
    expect(screen.queryByRole('button')).toBeNull();
    rerender(
      <UpdateAction
        run={vi.fn()}
        state={{ error: 'No network', status: 'error' }}
      />
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('does not replace a newer event with an old initial state', async () => {
    let resolveInitial!: (state: UpdateState) => void;
    getState.mockReturnValue(new Promise((resolve) => { resolveInitial = resolve; }));
    const { result, unmount } = renderHook(useUpdateAction);

    emitState({ status: 'available', version: '4.5.0' });
    await act(async () => resolveInitial({ status: 'idle' }));
    expect(result.current.state).toEqual({ status: 'available', version: '4.5.0' });
    expect(result.current.visible).toBe(true);
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('downloads, disables while downloading, and installs when ready', async () => {
    getState.mockResolvedValue({ status: 'available', version: '4.5.0' });
    render(<TestAction />);

    const button = await screen.findByRole('button', { name: 'Update' });
    expect(button.classList.contains('bp6-intent-primary')).toBe(true);
    expect(button.classList.contains('bp6-small')).toBe(true);
    expect(button.classList.contains('!rounded-md')).toBe(true);
    expect(button.classList.contains('!text-white')).toBe(true);
    expect(button.classList.contains('app-region-no-drag')).toBe(true);
    expect(button.querySelector('.bp6-icon')).toBeNull();
    expect(button.getAttribute('title')).toBe('Version 4.5.0');
    fireEvent.click(button);
    expect(download).toHaveBeenCalledOnce();
    const downloading = screen.getByRole('button', { name: 'Downloading update' });
    expect(downloading.hasAttribute('disabled')).toBe(true);
    expect(downloading.getAttribute('title')).toBe('Version 4.5.0');

    emitState({ status: 'ready', version: '4.5.0' });
    const ready = screen.getByRole('button', { name: 'Restart to update' });
    expect(ready.getAttribute('title')).toBe('Version 4.5.0');
    fireEvent.click(ready);
    expect(install).toHaveBeenCalledOnce();
  });

  it('keeps retry visible after a failed download', async () => {
    getState.mockResolvedValue({ status: 'available', version: '4.5.0' });
    download.mockRejectedValueOnce(new Error('Download failed'));
    render(<TestAction />);

    fireEvent.click(await screen.findByRole('button', { name: 'Update' }));
    const retry = await screen.findByRole('button', { name: 'Retry update' });
    expect(retry.getAttribute('title')).toContain('Version 4.5.0');
    expect(retry.getAttribute('title')).toContain('Download failed');
    fireEvent.click(retry);
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('uses the known version for a failed install and allows retry', async () => {
    getState.mockResolvedValue({ status: 'ready', version: '4.5.0' });
    install.mockRejectedValueOnce(new Error('Install failed'));
    render(<TestAction />);

    fireEvent.click(await screen.findByRole('button', { name: 'Restart to update' }));
    const retry = await screen.findByRole('button', { name: 'Retry update' });
    expect(retry.getAttribute('title')).toContain('Install failed');
    fireEvent.click(retry);
    expect(download).toHaveBeenCalledOnce();
  });
});
