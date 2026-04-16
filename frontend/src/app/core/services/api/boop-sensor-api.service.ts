import { Injectable, inject } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { ActionType } from '../../enum/ActionType';
import { SystemConfigService } from '../system-config.service';

@Injectable({
  providedIn: 'root'
})
export class BoopSensorApiService extends ApiBaseService {
  private readonly systemConfig = inject(SystemConfigService);

  resetCounter() {
    return this.http.delete(this.apiBaseUrl + "/boop-sensor/counter");
  }

  setEnabled(enabled: boolean) {
    return this.http.post<{ enabled: boolean }>(this.apiBaseUrl + "/boop-sensor/enabled", { enabled });
  }

  setShowOnHud(showOnHud: boolean) {
    return this.http.post<{ showOnHud: boolean }>(this.apiBaseUrl + "/boop-sensor/show-on-hud", { enabled: showOnHud });
  }

  getData() {
    return this.http.get<BoopSensorInfo>(this.apiBaseUrl + "/boop-sensor");
  }

  getProfiles() {
    if (!this.systemConfig.features()?.boopSensor) return of([]);
    return this.http.get<BoopSensorProfile[]>(this.apiBaseUrl + "/boop-sensor/profiles");
  }

  deleteProfile(profileId: string) {
    return this.http.delete(this.apiBaseUrl + "/boop-sensor/profiles/" + profileId);
  }

  createNewProfile(profile: NewBoopSensorProfile) {
    return this.http.post<BoopSensorProfile>(this.apiBaseUrl + "/boop-sensor/profiles", profile);
  }

  activateProfile(profileId: string) {
    return this.http.post<BoopSensorProfile>(this.apiBaseUrl + "/boop-sensor/profiles/" + profileId + "/activate", {});
  }

  deactivateProfile() {
    return this.http.delete(this.apiBaseUrl + "/boop-sensor/profiles/active");
  }

  updateProfile(profile: BoopSensorProfile) {
    return this.http.put<BoopSensorProfile>(this.apiBaseUrl + "/boop-sensor/profiles/" + profile.id, profile);
  }

  getProfileById(id: string) {
    return this.http.get<BoopSensorProfile>(this.apiBaseUrl + "/boop-sensor/profiles/" + id).pipe(catchError((err: HttpErrorResponse) => {
      if (err.status === 404) {
        return of(null);
      }
      throw err;
    }));
  }

  getActiveProfile() {
    return this.http.get<BoopSensorProfile | null>(this.apiBaseUrl + "/boop-sensor/profiles/active").pipe(catchError((err: HttpErrorResponse) => {
      if (err.status === 404) {
        return of(null);
      }
      throw err;
    }));
  }
}

export interface NewBoopSensorProfile {
  name: string;
}

export interface BoopSensorProfile {
  id: string;
  name: string;
  resetsAfter: string;
  actions: BoopSensorAction[];
}

export interface BoopSensorAction {
  virtualId?: string; // Used for internal tracking of the object
  id: string | undefined;
  triggerAtValue: number;
  actionType: ActionType;
  action: string;
  triggerMultipleTimes: boolean;
  metadata: string | null;
}

export interface BoopSensorInfo {
  lastTrigger: number;
  activeProfileId: string;
  state: boolean;
  enabled: boolean;
  boopCounter: number;
  showOnHud: boolean;
}
