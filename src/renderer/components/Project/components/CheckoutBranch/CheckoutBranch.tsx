import { Classes, Tag } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { BranchSelect } from 'renderer/components/BranchSelect';
import { useGit } from 'renderer/hooks/useGit';
import { appToaster } from 'renderer/utils/appToaster';
import { cn } from 'renderer/utils/cn';
import { type GitStatus } from 'types/project';

type Props = {
  getStatus: () => void;
  gitStatus: GitStatus;
  id: string;
  name: string;
};

export const CheckoutBranch: FC<Props> = ({ getStatus, gitStatus, id, name }) => {
  const { checkout } = useGit();

  const [loading, setLoading] = useState(false);
  const [tmpCurrent, setTmpCurrent] = useState<string>();

  const { branchSummary } = gitStatus ?? {};
  const { current } = branchSummary ?? {};

  const checkoutBranch = async (branch: string) => {
    setLoading(true);

    const cleanBranch = branch.replace(/(remote\/origin\/|origin\/)/, '');

    const res = await checkout(id, cleanBranch);

    setLoading(false);

    if (res.success) {
      setTmpCurrent(cleanBranch);
    } else {
      (await appToaster).show({
        icon: 'info-sign',
        intent: 'warning',
        message: `${name} checkout ${res.message}`,
        timeout: 0
      });
    }

    await getStatus();
    setTmpCurrent(undefined);
  };

  const branches = branchSummary?.branches ?? {};

  if (gitStatus && !current) {
    return (
      <div className={cn('flex flex-col', !gitStatus && Classes.SKELETON)}>
        <Tag
          icon="git-commit"
          intent="warning"
          minimal
        >
          No commits yet
        </Tag>
      </div>
    );
  }

  const currentBranch = tmpCurrent || current;

  let label = branches[currentBranch]?.label ?? '';
  label = label.replace(/\[.*\]/, '');

  return (
    <div className={cn('flex flex-col', !gitStatus && Classes.SKELETON)}>
      <BranchSelect
        currentBranch={currentBranch}
        gitStatus={gitStatus}
        loading={loading}
        onSelect={checkoutBranch}
      />

      <div
        className={cn(
          'max-w-60 mt-0.5 overflow-hidden text-xs font-light text-ellipsis whitespace-nowrap dark:text-bp-gray-3',
          loading && Classes.SKELETON
        )}
        title={label.length > 41 ? label : undefined}
      >
        {label}
      </div>
    </div>
  );
};
