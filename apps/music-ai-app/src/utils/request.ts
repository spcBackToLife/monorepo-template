import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { isMockEnabled, tryGetMockResponse } from './mock-manager';

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
instance.interceptors.response.use(
  (response) => {
    const { data } = response;
    if (data.code !== 0) {
      console.error(`[API Error] ${data.message || 'Unknown error'}`);
      return Promise.reject(new Error(data.message || 'Request failed'));
    }
    return data.data;
  },
  (error) => {
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Unified request function with mock support.
 *
 * When mock mode is enabled, matching requests are intercepted BEFORE
 * hitting the network — avoiding 500 errors from missing backend.
 */
export async function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  // ── Mock interception (before network) ──
  if (isMockEnabled()) {
    const url = config.url ?? '';
    const method = (config.method ?? 'GET').toUpperCase();
    const mockResult = tryGetMockResponse(url, method);
    if (mockResult) {
      await new Promise(resolve => setTimeout(resolve, mockResult.delay));
      return mockResult.data as T;
    }
  }

  return instance.request<unknown, T>(config);
}
