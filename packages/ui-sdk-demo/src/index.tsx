// 必须得引入这句话，否则 Prism 会报错
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './theme/styles/semi.css';

import { App } from './App';
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
