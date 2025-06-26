import { Classes, Tag } from '@blueprintjs/core';
import { type FC, useState } from 'react';
import { BranchSelect } from 'rendered/components/BranchSelect';
import { useGit } from 'rendered/hooks/useGit';
import { appToaster } from 'rendered/utils/appToaster';
import { type GitStatus } from 'types/project';

import { BranchLabel, Root } from './CheckoutBranch.styles';

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
      <Root className={!gitStatus && Classes.SKELETON}>
        <Tag
          icon="git-commit"
          intent="warning"
          minimal
        >
          No commits yet
        </Tag>
      </Root>
    );
  }

  const currentBranch = tmpCurrent || current;

  let label = branches[currentBranch]?.label ?? '';
  label = label.replace(/\[.*\]/, '');

  return (
    <Root className={!gitStatus && Classes.SKELETON}>
      <BranchSelect
        currentBranch={currentBranch}
        gitStatus={gitStatus}
        loading={loading}
        onSelect={checkoutBranch}
      />

      <BranchLabel
        className={loading && Classes.SKELETON}
        title={label.length > 41 ? label : undefined}
      >
        {label}
      </BranchLabel>
    </Root>
  );
};
