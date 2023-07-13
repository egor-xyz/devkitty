import { Route, Routes } from 'react-router-dom';

import { Settings } from './components/Settings';
import { Projects } from './components/Projects/Projects';
import { GitHub } from './components/GitHub';
// add route names here
export const Routing = () => (
  <Routes>
    <Route
      element={<Projects />}
      path="/"
    />

    <Route
      element={<Settings />}
      path="settings"
    />

    <Route
      element={<GitHub />}
      path="github"
    />

    <Route
      element={<h1>404</h1>}
      path="*"
    />
  </Routes>
);
