import { FC } from 'react';
import { Route, Switch } from 'react-router-dom';

import { Licenses, ProjectsPage, Settings } from 'pages';
import { JenkinsPage } from 'modules';

export const Routes: FC = () => (
  <Switch>
    <Route
      component={Settings}
      exact={true}
      path='/config'
    />
    <Route
      component={Licenses}
      exact={true}
      path='/licenses'
    />
    <Route
      component={JenkinsPage}
      exact={true}
      path='/jenkins'
    />
    <Route
      component={ProjectsPage}
      exact={true}
      path='/'
    />
  </Switch>
);