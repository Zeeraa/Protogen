import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError, map, Observable, of } from 'rxjs';
import { RGBColor } from '../utils/Utils';

@Injectable({
  providedIn: 'root'
})
export class SystemApiService extends ApiBaseService {
  getOverview(): Observable<SystemOverview> {
    return this.http.get<SystemOverview>(this.apiBaseUrl + "/system/overview").pipe(catchError(this.defaultErrorHandler));
  }

  shutdown() {
    return this.http.post(this.apiBaseUrl + "/system/shutdown", {}).pipe(catchError(this.defaultErrorHandler));
  }

  restartFlaschenTaschen() {
    return this.http.post(this.apiBaseUrl + "/system/flaschen-taschen/restart", {}).pipe(catchError(this.defaultErrorHandler));
  }

  getFlaschenTaschenSettings() {
    return this.http.get<FlaschenTaschenSettings>(this.apiBaseUrl + "/system/flaschen-taschen/settings").pipe(catchError(this.defaultErrorHandler));
  }

  updateFlaschenTaschenSettings(settings: FlaschenTaschenSettings) {
    return this.http.put(this.apiBaseUrl + "/system/flaschen-taschen/settings", settings).pipe(catchError(this.defaultErrorHandler));
  }

  getNetworkInterfaces() {
    return this.http.get<NetworkInterfaceInfo[]>(this.apiBaseUrl + "/system/network-interfaces");
  }

  getLogs() {
    return this.http.get(this.apiBaseUrl + "/system/logs", {
      responseType: 'text',
    }).pipe(catchError(this.defaultErrorHandler)) as Observable<string>;
  }

  getSessionId() {
    return this.http.get<ISessionIdObject>(this.apiBaseUrl + "/system/session-id").pipe(
      map(response => String(response.sessionId)),
      catchError(() => {
        console.error('Request failed');
        return of(null);
      })
    );
  }

  setSwaggerEnabled(enabled: boolean): Observable<any> {
    return this.http.put(this.apiBaseUrl + "/system/swagger", { enabled }).pipe(catchError(this.defaultErrorHandler));
  }

  getClockSettings(): Observable<ClockSettings> {
    return this.http.get<ClockSettings>(this.apiBaseUrl + "/system/clock-settings");
  }

  updateClockSettings(settings: ClockSettings): Observable<any> {
    return this.http.put(this.apiBaseUrl + "/system/clock-settings", settings);
  }

  getAudioDevices(): Observable<AudioDevice[]> {
    return this.http.get<AudioDevice[]>(this.apiBaseUrl + "/system/audio-devices");
  }

  setAudioDevice(deviceId: number): Observable<any> {
    return this.http.put(this.apiBaseUrl + "/system/audio-device", { deviceId });
  }
}

interface ISessionIdObject {
  sessionId: string;
}

export interface SystemOverview {
  cpuTemperature: number;
  osVersion: string;
  cpuUsage: number;
  ramUsage: number;
  network: Network;
  hudEnabled: boolean;
  swaggerEnabled: boolean;
  backendVersion: string;
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

export interface ClockSettings {
  is24HourFormat: boolean;
  showSeconds: boolean;
  showDate: boolean;
  timeColor: RGBColor;
  dateColor: RGBColor;
}

export interface NetworkInterfaceInfo {
  name: string;
  ipv4: string | null;
  ipv6: string | null;
}

export interface AudioDevice {
  id: number;
  name: string;
  isDefault: boolean;
}