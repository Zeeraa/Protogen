import { computed, effect, Injectable, signal } from '@angular/core';
import { LocalStorageKey_BootswatchTheme, LocalStorageKey_Theme } from './utils/LocalStorageKeys';

const BootswatchLinkId = 'bootswatch-theme-link';

export const BootswatchThemes = [
  'brite', 'cerulean', 'cosmo', 'cyborg', 'darkly', 'flatly', 'journal',
  'litera', 'lumen', 'lux', 'materia', 'minty', 'morph', 'pulse', 'quartz',
  'sandstone', 'simplex', 'sketchy', 'slate', 'solar', 'spacelab', 'superhero',
  'united', 'vapor', 'yeti', 'zephyr'
] as const;

export type BootswatchTheme = typeof BootswatchThemes[number];

function loadTheme(): Theme {
  const storedTheme = localStorage.getItem(LocalStorageKey_Theme);
  if (storedTheme === Theme.Dark) return Theme.Dark;
  if (storedTheme === Theme.Light) return Theme.Light;
  return Theme.System;
}

function loadBootswatchTheme(): string | null {
  return localStorage.getItem(LocalStorageKey_BootswatchTheme);
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public readonly theme = signal<Theme>(loadTheme());
  public readonly bootswatchTheme = signal<string | null>(loadBootswatchTheme());

  public readonly appliedTheme = computed<Theme>(() => {
    const theme = this.theme();
    if (theme == Theme.System) {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDarkMode ? Theme.Dark : Theme.Light;
    }
    return theme;
  });

  constructor() {
    effect(() => {
      const appliedTheme = this.appliedTheme();

      if (appliedTheme == Theme.Dark) {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
      } else if (appliedTheme == Theme.Light) {
        document.documentElement.setAttribute('data-bs-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-bs-theme');
      }

      console.log("Theme updated to: " + appliedTheme);
    });

    effect(() => {
      const theme = this.bootswatchTheme();
      this.applyBootswatchTheme(theme);
    });
  }

  public setTheme(newTheme: Theme) {
    this.theme.set(newTheme);
    localStorage.setItem(LocalStorageKey_Theme, newTheme);
  }

  public toggleTheme() {
    const currentTheme = this.appliedTheme();
    if (currentTheme == Theme.Dark) {
      this.setTheme(Theme.Light);
    } else if (currentTheme == Theme.Light) {
      this.setTheme(Theme.Dark);
    }
  }

  public setBootswatchTheme(theme: string | null) {
    this.bootswatchTheme.set(theme);
    if (theme) {
      localStorage.setItem(LocalStorageKey_BootswatchTheme, theme);
    } else {
      localStorage.removeItem(LocalStorageKey_BootswatchTheme);
    }
  }

  private applyBootswatchTheme(theme: string | null) {
    let link = document.getElementById(BootswatchLinkId) as HTMLLinkElement | null;

    if (!theme) {
      link?.remove();
      return;
    }

    if (!link) {
      link = document.createElement('link');
      link.id = BootswatchLinkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    link.href = `css/bootswatch/${theme}/bootstrap.min.css`;
  }
}

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  System = 'system'
}

