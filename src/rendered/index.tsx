import { createRoot } from 'react-dom/client';

import { AllProviders } from './AllProviders';
import { App } from './App';
import './index.css';

const container = document.getElementById('app');
const root = createRoot(container);

root.render(
  <AllProviders>
    <App />
  </AllProviders>
);
