import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './views/app';
import 'antd/dist/reset.css';
import './styles/index.css';
import './styles/theme.less';
import { a } from '@sass/ui-sdk-demo';
console.log('aaaa:', a);
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
