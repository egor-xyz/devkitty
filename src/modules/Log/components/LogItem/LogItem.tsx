import { FC } from 'react';
import moment from 'moment';
import { Tag, Text } from '@blueprintjs/core';

import { Log } from 'context';

import { Root } from './LogItem.styles';

interface Props {
  log: Log;
}

export const LogItem: FC<Props> = ({ log: { text: __html, date, intent } }) => (
  <Root>
    <Tag
      className='date'
      icon={'updated'}
      intent={intent}
    >{moment(date).format('MM.DD.YYYY HH:mm:ss')}</Tag>
    <Text
      className='text'
      ellipsize={true}
    >
      {/* eslint-disable-next-line */}
      <span dangerouslySetInnerHTML={{ __html }} />
    </Text>
  </Root>
);