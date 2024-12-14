import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiBaseService } from '../api-base.service';
import { catchError, map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SystemApiService extends ApiBaseService {
  constructor(
    http: HttpClient,
    toastr: ToastrService,
  ) {
    super(http, toastr);
  }

  getOverview(): Observable<SystemOverview> {
    return this.http.get(this.apiBaseUrl + "/system/overview").pipe(catchError(this.defaultErrorHandler)) as any as Observable<SystemOverview>;
  }

  shutdown() {
    return this.http.post(this.apiBaseUrl + "/system/shutdown", {}).pipe(catchError(this.defaultErrorHandler)) as any as Observable<any>;
  }

  restartFlaschenTaschen() {
    return this.http.post(this.apiBaseUrl + "/system/flaschen-taschen/restart", {}).pipe(catchError(this.defaultErrorHandler)) as any as Observable<any>;
  }

  getFlaschenTaschenSettings() {
    return this.http.get(this.apiBaseUrl + "/system/flaschen-taschen/settings").pipe(catchError(this.defaultErrorHandler)) as any as Observable<FlaschenTaschenSettings>;
  }

  updateFlaschenTaschenSettings(settings: FlaschenTaschenSettings) {
    return this.http.put(this.apiBaseUrl + "/system/flaschen-taschen/settings", settings).pipe(catchError(this.defaultErrorHandler)) as any as Observable<any>;
  }

  getLogs(): Observable<string> {
    return this.http.get(this.apiBaseUrl + "/system/logs", {
      responseType: 'text',
    }).pipe(catchError(this.defaultErrorHandler)) as any as Observable<string>;
  }

  getSessionId(): Observable<string | null> {
    return this.http.get<any>(this.apiBaseUrl + "/system/session-id").pipe(
      map(response => String(response.sessionId)),
      catchError(() => {
        console.error('Request failed');
        return of(null);
      })
    );
  }
}

export interface SystemOverview {
  cpuTemperature: number;
  osVersion: string;
  cpuUsage: number;
  ramUsage: number;
  network: Network;
  hudEnabled: boolean;
}

export interface Network {
  hasConnectivity: boolean;
  ip: string | null;
  isp: string | null;
}

export interface FlaschenTaschenSettings {
  ledSlowdownGpio: number;
  ledLimitRefresh: number;
}
