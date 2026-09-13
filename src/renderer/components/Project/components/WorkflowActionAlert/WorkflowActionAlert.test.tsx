// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { refresh } from 'renderer/services/poller';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('renderer/services/poller', () => ({ refresh: vi.fn() }));

import { WorkflowActionAlert } from './WorkflowActionAlert';

describe('WorkflowActionAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes PR status after a workflow rerun starts', async () => {
    vi.mocked(window.bridge.gitAPI.rerunWorkflow).mockResolvedValue({ success: true });

    render(
      <WorkflowActionAlert
        action="rerun"
        darkMode={false}
        isOpen
        onClose={vi.fn()}
        projectId="project-1"
        runId={9001}
        runName="Build"
      />
    );

    fireEvent.click(screen.getByText('Re-run all'));

    await waitFor(() => expect(refresh).toHaveBeenCalledWith('prChecks:project-1:'));
  });
});
