import { createBrowserRouter } from 'react-router-dom';

import { WelcomeOnboarding } from '@/pages/WelcomeOnboarding';

import { HomeMusicAIHub } from '@/pages/HomeMusicAIHub';

import { ChatAIConversation } from '@/pages/ChatAIConversation';


export const router = createBrowserRouter([

  { path: '/welcome', element: <WelcomeOnboarding /> },

  { path: '/home', element: <HomeMusicAIHub /> },

  { path: '/chat', element: <ChatAIConversation /> },

]);
