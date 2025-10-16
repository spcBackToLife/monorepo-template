import { Suspense, useEffect, useState } from 'react';

import { BrowserRouter, Route, Routes } from 'react-router-dom';
// import { JarvisRoute } from './Sdk';
// 引入Semi Design主题样式文件
import './theme/styles/semi.css';
const enum CustomNavItemEnum {
  BatchBdApply = 'BatchBdApply',
}

const enum CustomRouterNames {
  BatchBdApply = '/batch-bd-apply',
}

export const App = () => {
  return (
    <Suspense>
      <BrowserRouter>
        <Routes>
          <Route path={'/'} element={<div>123</div>}></Route>
        </Routes>
      </BrowserRouter>
    </Suspense>
  );
};
