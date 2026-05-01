import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './views/app';
import 'antd/dist/reset.css';
import './styles/index.css';
import './styles/theme.less';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in document');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
