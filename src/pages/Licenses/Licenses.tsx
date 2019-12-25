import { FC } from 'react';
import toPairs from 'lodash/toPairs';
import { Callout, Card } from '@blueprintjs/core';
import styled from 'styled-components';

import licenses from 'utils/licenses.json';
import { openExternalURL } from 'utils';

import { ILicense } from './types';

const licensesList = toPairs<ILicense>(licenses);

export const Licenses: FC = () => {
  return (<Root>
    <h1>LICENSE</h1>

    <h3>Copyright (c) 2020 Egor Stronhin</h3>

    <div>
        Permission is hereby granted, free of charge, to any person obtaining
        a copy of this software and associated documentation files (the
        &quot;Software&quot;), to deal in the Software without restriction, including
        without limitation the rights to use, copy, modify, merge, publish,
        distribute, sublicense, and/or sell copies of the Software, and to
        permit persons to whom the Software is furnished to do so, subject to
        the following conditions:
    </div>

    <div>
        The above copyright notice and this permission notice shall be
        included in all copies or substantial portions of the Software.
    </div>

    <br />

    <Callout className='bp3-elevation-4'>
      {/* eslint-disable-next-line */}
        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
        EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
        NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
        LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
        OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
        WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    </Callout>

    <h3>
      This application bundles the following third-party packages in accordance
      with the following licenses:
    </h3>

    {licensesList.map(([name, value], key) => (
      <div key={key}>
        <Card
          className='card'
          elevation={4}
        >
          <div>Package: {name}</div>
          <div>License: {value.licenses}</div>
          <div>
            <span>License: </span>
            <a
              href='/'
              onClick={e => {
                e.preventDefault();
                openExternalURL(value.licenseUrl);
                return false;
              }}
            >{value.licenseUrl}</a>
          </div>
          <div>
            <span>Repo: </span>
            <a
              href='/'
              onClick={e => {
                e.preventDefault();
                openExternalURL(value.repository);
                return false;
              }}
            >{value.repository}</a>
          </div>
        </Card>
      </div>
    ))}
  </Root>);
};

const Root = styled.div`
  height: calc(100vh - 50px);
  overflow: auto;
  padding: 0 40px 40px;  
  .card {
    margin: 20px 0;
  }
`;