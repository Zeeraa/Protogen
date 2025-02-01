import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiBaseService } from '../api-base.service';
import { catchError, map, Observable, of } from 'rxjs';
import { typeAssert } from '../utils/Utils';

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
    return typeAssert<Observable<SystemOverview>>(this.http.get(this.apiBaseUrl + "/system/overview").pipe(catchError(this.defaultErrorHandler)));
  }

  shutdown() {
    return typeAssert<Observable<any>>(this.http.post(this.apiBaseUrl + "/system/shutdown", {}).pipe(catchError(this.defaultErrorHandler)));
  }

  restartFlaschenTaschen() {
    return typeAssert<Observable<any>>(this.http.post(this.apiBaseUrl + "/system/flaschen-taschen/restart", {}).pipe(catchError(this.defaultErrorHandler)));
  }

  getFlaschenTaschenSettings() {
    return typeAssert<Observable<FlaschenTaschenSettings>>(this.http.get(this.apiBaseUrl + "/system/flaschen-taschen/settings").pipe(catchError(this.defaultErrorHandler)));
  }

  updateFlaschenTaschenSettings(settings: FlaschenTaschenSettings) {
    return typeAssert<Observable<any>>(this.http.put(this.apiBaseUrl + "/system/flaschen-taschen/settings", settings).pipe(catchError(this.defaultErrorHandler)));
  }

  getLogs(): Observable<string> {
    return typeAssert<Observable<string>>(this.http.get(this.apiBaseUrl + "/system/logs", {
      responseType: 'text',
    }).pipe(catchError(this.defaultErrorHandler)));
  }

  getSessionId(): Observable<string | null> {
    return typeAssert<Observable<string | null>>(this.http.get<any>(this.apiBaseUrl + "/system/session-id").pipe(
      map(response => String(response.sessionId)),
      catchError(() => {
        console.error('Request failed');
        return of(null);
      })
    ));
  }

  setSwaggerEnabled(enabled: boolean): Observable<any> {
    return typeAssert<Observable<any>>(this.http.put(this.apiBaseUrl + "/system/swagger", { enabled }).pipe(catchError(this.defaultErrorHandler)));
  }
}

export interface SystemOverview {
  cpuTemperature: number;
  osVersion: string;
  cpuUsage: number;
  ramUsage: number;
  network: Network;
  hudEnabled: boolean;
  swaggerEnabled: boolean;
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
