import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SystemFeatures {
  serial: boolean;
  rgb: boolean;
  hud: boolean;
  boopSensor: boolean;
  videoPlayback: boolean;
  systemd: boolean;
}

export interface SystemConfig {
  features: SystemFeatures;
}

const RETRY_DELAY = 15;

@Injectable({
  providedIn: 'root'
})
export class SystemConfigService {
  private readonly http = inject(HttpClient);

  private readonly _features = signal<SystemFeatures | null>(null);
  public readonly features = this._features.asReadonly();

  private readonly _loaded = signal(false);
  public readonly loaded = this._loaded.asReadonly();

  private readonly _error = signal(false);
  public readonly error = this._error.asReadonly();

  private readonly _retryCountdown = signal(0);
  readonly retryCountdown = this._retryCountdown.asReadonly();

  public async load(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<SystemConfig>(`${environment.apiUrl}/system-config`).pipe(
          retry({ count: 5, delay: 1000 })
        )
      );
      this._features.set(config.features);
      this._loaded.set(true);
      this._error.set(false);
    } catch {
      this._error.set(true);
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    this._retryCountdown.set(RETRY_DELAY);
    const interval = setInterval(() => {
      const next = this._retryCountdown() - 1;
      this._retryCountdown.set(next);
      if (next <= 0) clearInterval(interval);
    }, 1000);

    setTimeout(async () => {
      try {
        const config = await firstValueFrom(
          this.http.get<SystemConfig>(`${environment.apiUrl}/system-config`)
        );
        this._features.set(config.features);
        this._loaded.set(true);
        this._error.set(false);
      } catch {
        this.scheduleRetry();
      }
    }, RETRY_DELAY * 1000);
  }
}
