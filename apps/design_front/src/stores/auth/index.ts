import { ApiError, apiJson, getErrorMessage } from '@/api/client';
import { makeAutoObservable, runInAction } from 'mobx';

const TOKEN_KEY = 'design_auth_token';

export type AuthUser = { id: string; email: string };

type TokenResponse = { access_token: string; user: AuthUser };

class AuthStore {
  token: string | null =
    typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

  user: AuthUser | null = null;

  sessionReady = false;

  constructor() {
    makeAutoObservable(this);
  }

  get isAuthenticated(): boolean {
    return Boolean(this.token && this.user);
  }

  setToken(token: string | null): void {
    this.token = token;
    if (typeof localStorage === 'undefined') return;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async bootstrap(): Promise<void> {
    try {
      if (this.token) {
        const res = await apiJson<{ user: AuthUser }>('/auth/me', {
          token: this.token,
        });
        runInAction(() => {
          this.user = res.user;
        });
      }
    } catch {
      runInAction(() => {
        this.setToken(null);
        this.user = null;
      });
    } finally {
      runInAction(() => {
        this.sessionReady = true;
      });
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const res = await apiJson<TokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      runInAction(() => {
        this.setToken(res.access_token);
        this.user = res.user;
      });
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        throw new Error(getErrorMessage(e.body));
      }
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  async register(email: string, password: string): Promise<void> {
    try {
      const res = await apiJson<TokenResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      runInAction(() => {
        this.setToken(res.access_token);
        this.user = res.user;
      });
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        throw new Error(getErrorMessage(e.body));
      }
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  logout(): void {
    this.setToken(null);
    this.user = null;
  }
}

export const authStore = new AuthStore();
