import { Button } from '@blueprintjs/core';
import { useEffect, useState } from 'react';
import { type UpdateState } from 'types/update';

const updateButton = {
  available: { ariaLabel: 'Update', label: 'Update' },
  downloading: { ariaLabel: 'Downloading update', label: 'Downloading…' },
  error: { ariaLabel: 'Retry update', label: 'Retry update' },
  idle: { ariaLabel: '', label: '' },
  ready: { ariaLabel: 'Restart to update', label: 'Restart to update' }
} as const;

export const useUpdateAction = (): { run: () => void; state: UpdateState; visible: boolean; } => {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });

  useEffect(() => {
    let active = true;
    let receivedState = false;
    const unsubscribe = window.bridge.updater.onState((nextState: UpdateState) => {
      receivedState = true;
      if (active) setState(nextState);
    });

    void window.bridge.updater.getState().then((nextState: UpdateState) => {
      if (active && !receivedState) setState(nextState);
    }).catch((error: unknown) => {
      if (active && !receivedState) {
        setState({ error: String(error), status: 'error' });
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const run = () => {
    if (state.status === 'ready') {
      void window.bridge.updater.install().catch((error: unknown) => {
        setState((current) => ({ ...current, error: String(error), status: 'error' }));
      });
      return;
    }

    setState((current) => ({ ...current, error: undefined, status: 'downloading' }));
    void window.bridge.updater.download().catch((error: unknown) => {
      setState((current) => ({ ...current, error: String(error), status: 'error' }));
    });
  };

  return {
    run,
    state,
    visible: state.status !== 'idle' && (state.status !== 'error' || Boolean(state.version))
  };
};

export const UpdateAction = ({ run, state }: { run: () => void; state: UpdateState }) => {
  if (state.status === 'idle' || (state.status === 'error' && !state.version)) return null;
  const versionLabel = state.version ? `Version ${state.version}` : '';
  const title = state.status === 'error'
    ? `${versionLabel}${versionLabel ? ' · ' : ''}${state.error || 'Update failed. Try again.'}`
    : versionLabel || undefined;

  return (
    <Button
      aria-label={updateButton[state.status].ariaLabel}
      className="app-region-no-drag shrink-0 !rounded-md !text-xs !text-white"
      disabled={state.status === 'downloading'}
      intent="primary"
      onClick={run}
      small
      title={title}
    >
      {updateButton[state.status].label}
    </Button>
  );
};
