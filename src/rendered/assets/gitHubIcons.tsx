import { type FC, type SVGProps } from 'react';
import { cn } from 'rendered/utils/cn';

import ActionCanceledSvg from './gitHub/action-canceled.svg?react';
import ActionDoneSvg from './gitHub/action-done.svg?react';
import ActionFailedSvg from './gitHub/action-failed.svg?react';
import ActionInProgressSvg from './gitHub/action-in-progress.svg?react';
import ActionPendingSvg from './gitHub/action-pending.svg?react';
import ActionsSvg from './gitHub/actions.svg?react';
import GithubSvg from './gitHub/github.svg?react';

type SvgProps = SVGProps<SVGSVGElement>;

export const ActionsIcon: FC<SvgProps> = ({ className }) => (
  <ActionsSvg className={cn('fill-bp-gray-1 dark:fill-bp-gray-4', className)} />
);

export const GitHubIcon: FC<SvgProps> = ({ className }) => (
  <GithubSvg className={cn('fill-bp-gray-1 dark:fill-bp-gray-4', className)} />
);

export const ActionsCanceledIcon: FC<SvgProps> = ({ className }) => (
  <ActionCanceledSvg className={cn('fill-bp-gray-1 dark:fill-bp-gray-4', className)} />
);

export const ActionDoneIcon: FC<SvgProps> = ({ className }) => (
  <ActionDoneSvg className={cn('fill-[#1a7f37] dark:fill-[#57ab5a]', className)} />
);

export const ActionFailedIcon: FC<SvgProps> = ({ className }) => (
  <ActionFailedSvg className={cn('fill-[#d1242f] dark:fill-[#e5534b]', className)} />
);

export const ActionInProgressIcon: FC<SvgProps> = ({ className }) => (
  <ActionInProgressSvg className={cn('action-in-progress', className)} />
);

export const ActionPendingIcon: FC<SvgProps> = ({ className }) => (
  <ActionPendingSvg className={cn('action-pending', className)} />
);
