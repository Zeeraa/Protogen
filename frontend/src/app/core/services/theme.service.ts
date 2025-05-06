import { Injectable } from '@angular/core';

const ThemeStorageKey = "theme";

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private _theme: Theme;

  constructor() {
    const storedTheme = localStorage.getItem(ThemeStorageKey);
    if (storedTheme == null) {
      this._theme = Theme.System;
    } else {
      this._theme = storedTheme == Theme.Dark ? Theme.Dark : Theme.Light;
    }
  }

  public get theme(): Theme {
    return this._theme;
  }

  public set theme(newTheme: Theme) {
    this._theme = newTheme;
    localStorage.setItem(ThemeStorageKey, newTheme);
    this.update();
  }

  public get appliedTheme() {
    let appliedTheme = this.theme;
    if (appliedTheme == Theme.System) {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      appliedTheme = isDarkMode ? Theme.Dark : Theme.Light;
    }
    return appliedTheme;
  }

  public toggleTheme() {
    const currentTheme = this.appliedTheme;
    if (currentTheme == Theme.Dark) {
      this.theme = Theme.Light;
    } else if (currentTheme == Theme.Light) {
      this.theme = Theme.Dark;
    }
  }

  public update() {
    const appliedTheme = this.appliedTheme;

    if (appliedTheme == Theme.Dark) {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else if (appliedTheme == Theme.Light) {
      document.documentElement.setAttribute('data-bs-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-bs-theme');
    }

    console.log("Theme updated to: " + appliedTheme);
  }
}

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  System = 'system'
}

