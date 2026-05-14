import { createBrowserRouter, Navigate } from 'react-router-dom';

import { WelcomeOnboarding } from '@/pages/WelcomeOnboarding';

import { HomeMusicAIHub } from '@/pages/HomeMusicAIHub';

import { ChatAIConversation } from '@/pages/ChatAIConversation';

import { HistoryMyCreations } from '@/pages/HistoryMyCreations';

import { ProfileMyAccount } from '@/pages/ProfileMyAccount';


export const router = createBrowserRouter([

  { path: '/', element: <Navigate to="/welcome" replace /> },


  { path: '/welcome', element: <WelcomeOnboarding /> },

  { path: '/home', element: <HomeMusicAIHub /> },

  { path: '/chat', element: <ChatAIConversation /> },

  { path: '/history', element: <HistoryMyCreations /> },

  { path: '/profile', element: <ProfileMyAccount /> },

]);
