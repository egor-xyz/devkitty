import { Button } from '@blueprintjs/core';
import { type FC } from 'react';
import { getStatusIcon } from 'rendered/assets/gitHubStatusUtils';
import { type Run } from 'types/gitHub';

type Props = {
  run: Run;
};

const tagLength = 75;

export const Workflow: FC<Props> = ({ run }) => {
  const { conclusion, display_title, event, head_branch, html_url, name, run_number, status } = run;
  const Icon = getStatusIcon(conclusion || status);

  const openInBrowser = () => {
    window.open(html_url, '_blank');
  };

  return (
    <div className="flex relative items-center justify-between min-h-5 py-1.5 px-5 pl-5 bg-blueprint-light-gray4 dark:bg-blueprint-dark-gray2 my-0.5 [&+&]:mt-0">
      <div className="overflow-hidden flex text-left justify-start gap-4 items-center">
        <div title={conclusion || status}>
          <Icon />
        </div>

        <div className="overflow-hidden text-sm flex flex-col">
          <div className="overflow-hidden text-ellipsis whitespace-nowrap">
            <b>{name}</b>
            {': '}
            {event !== 'workflow_dispatch' ? event : 'manual'}
            {' » '}
            {head_branch.length > tagLength ? `${head_branch.slice(0, tagLength)}...` : head_branch}
            {' (#'}
            {run_number}
            {')'}
          </div>

          <div className="overflow-hidden whitespace-nowrap text-ellipsis -mt-0.5 text-xs font-light dark:text-blueprint-gray3">
            {display_title}
          </div>
        </div>
      </div>

      <Button
        icon="globe"
        onClick={openInBrowser}
      />
    </div>
  );
};
