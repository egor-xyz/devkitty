import { Button, Tag } from '@blueprintjs/core';
import { FC } from 'react';

import { ProjectActions, Info, Root, Title, MiddleBlock } from '../../Project.styles';

type Props = {
  name: string;
  removeAlert: () => void;
};

export const Error: FC<Props> = ({ name, removeAlert }) => (
  <Root>
    <Info>
      <Title>{name}</Title>
    </Info>

    <MiddleBlock>
      <Tag
        minimal
        icon="folder-open"
        intent="warning"
      >
        Git repository not found
      </Tag>
    </MiddleBlock>

    <ProjectActions>
      <Button
        large
        icon="trash"
        intent="danger"
        onClick={removeAlert}
      />
    </ProjectActions>
  </Root>
);
