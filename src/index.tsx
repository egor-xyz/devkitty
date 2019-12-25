import ReactDOM from 'react-dom';
import { configure } from 'electron-settings';

import 'normalize.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import './index.scss';

import { App } from 'components';
import { AppStoreProvider } from 'context';

configure({
  numSpaces: 2,
  prettify: true
});

ReactDOM.render((
  <AppStoreProvider>
    <App />
  </AppStoreProvider>
), document.getElementById('root'));
