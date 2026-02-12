import { Button, Tag } from '@blueprintjs/core';
import { type FC } from 'react';
import { cn } from 'renderer/utils/cn';

type Props = {
  name: string;
  removeAlert: () => void;
};

export const Error: FC<Props> = ({ name, removeAlert }) => (
  <div
    className={cn(
      'flex relative items-center justify-between min-h-[55px] py-0.5 pl-5 pr-4',
      'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2',
      '[&+&]:mt-0.5'
    )}
  >
    <div className="flex flex-1 items-center justify-between w-full pr-2.5 gap-2.5">
      <div className="font-medium">{name}</div>
    </div>

    <div className="flex flex-2 items-center min-w-[395px] gap-2.5">
      <Tag
        icon="folder-open"
        intent="warning"
        minimal
      >
        Git repository not found
      </Tag>
    </div>

    <div className="flex relative flex-row-reverse min-w-[79px] ml-auto select-none">
      <Button
        icon="trash"
        intent="danger"
        large
        onClick={removeAlert}
      />
    </div>
  </div>
);
