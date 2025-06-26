import { Route, Routes } from 'react-router';

import { Projects } from './components/Projects/Projects';
import { Settings } from './components/Settings';
// add route names here
export const Routing = () => (
  <Routes>
    <Route
      element={<Projects />}
      path="/"
    />

    <Route
      element={<Settings />}
      path="settings/:id?"
    />

    <Route
      element={<h1>404</h1>}
      path="*"
    />
  </Routes>
);
