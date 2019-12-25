import flow from 'lodash/fp/flow';
import toPairs from 'lodash/fp/toPairs';
import sortBy from 'lodash/fp/sortBy';
import fromPairs from 'lodash/fp/fromPairs';

export const sortObjectKeys = (obj: any) => flow(
  toPairs,
  sortBy(0),
  fromPairs
)({ ...obj });