import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './views/app';
import './styles/index.css';
import './styles/theme.less';
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
