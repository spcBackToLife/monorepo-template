import { makeAutoObservable } from 'mobx';

export enum ThemeMode {
  Light = 'light',
  Dark = 'dark',
  System = 'system',
}

const LOCAL_KEY = 'h5_theme_mode';

export class ThemeStore {
  mode: ThemeMode = ThemeMode.System;

  constructor() {
    makeAutoObservable(this);
    this.load();
    this.apply();
  }

  setMode(next: ThemeMode): void {
    this.mode = next;
    this.save();
    this.apply();
  }

  private resolveSystem(): ThemeMode.Light | ThemeMode.Dark {
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? ThemeMode.Dark : ThemeMode.Light;
  }

  private save(): void {
    localStorage.setItem(LOCAL_KEY, this.mode);
  }

  private load(): void {
    const raw = localStorage.getItem(LOCAL_KEY) as ThemeMode | null;
    if (raw === ThemeMode.Light || raw === ThemeMode.Dark || raw === ThemeMode.System) {
      this.mode = raw;
    }
  }

  private apply(): void {
    const root = document.documentElement;
    const effective = this.mode === ThemeMode.System ? this.resolveSystem() : this.mode;
    // Tailwind 的 class 暗色开关 & antd-mobile 的 dark 主题属性
    root.classList.toggle('dark', effective === ThemeMode.Dark);
    root.classList.toggle('theme-dark', effective === ThemeMode.Dark);
    root.setAttribute('adm-theme', effective === ThemeMode.Dark ? 'dark' : 'light');
  }
}

export const themeStore = new ThemeStore();
