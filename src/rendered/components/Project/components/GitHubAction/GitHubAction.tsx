import { FC } from 'react';

import { Run } from 'types/gitHub';

import { Root } from './GitHubAction.styles';

type Props = {
  run: Run;
};

export const GitHubAction: FC<Props> = ({ run: { display_title } }) => {
  return <Root>{display_title}</Root>;
};
