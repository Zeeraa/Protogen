import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';
import { ActionType } from '../../enum/ActionType';

@Injectable({
  providedIn: 'root'
})
export class BoopSensorApiService extends ApiBaseService {
  constructor(
    http: HttpClient,
    toastr: ToastrService,
  ) {
    super(http, toastr);
  }

  resetCounter() {
    return this.http.delete(this.apiBaseUrl + "/boop-sensor/counter").pipe(catchError(this.defaultErrorHandler));
  }

  setEnabled(enabled: boolean) {
    return this.http.post<{ enabled: boolean }>(this.apiBaseUrl + "/boop-sensor/enabled", { enabled }).pipe(catchError(this.defaultErrorHandler));
  }

  setShowOnHud(showOnHud: boolean) {
    return this.http.post<{ showOnHud: boolean }>(this.apiBaseUrl + "/boop-sensor/show-on-hud", { enabled: showOnHud }).pipe(catchError(this.defaultErrorHandler));
  }

  getData() {
    return this.http.get<BoopSensorInfo>(this.apiBaseUrl + "/boop-sensor").pipe(catchError(this.defaultErrorHandler));
  }

  getProfiles() {
    return this.http.get<BoopSensorProfile[]>(this.apiBaseUrl + "/boop-sensor/profiles").pipe(catchError(this.defaultErrorHandler));
  }

  deleteProfile(profileId: string) {
    return this.http.delete(this.apiBaseUrl + "/boop-sensor/profiles/" + profileId).pipe(catchError(this.defaultErrorHandler));
  }

  createNewProfile(profile: NewBoopSensorProfile) {
    return this.http.post<BoopSensorProfile>(this.apiBaseUrl + "/boop-sensor/profiles", profile).pipe(catchError(this.defaultErrorHandler));
  }

  activateProfile(profileId: string) {
    return this.http.post<BoopSensorProfile>(this.apiBaseUrl + "/boop-sensor/profiles/" + profileId + "/activate", {}).pipe(catchError(this.defaultErrorHandler));
  }

  deactivateProfile() {
    return this.http.delete(this.apiBaseUrl + "/boop-sensor/profiles/active").pipe(catchError(this.defaultErrorHandler));
  }

  updateProfile(profile: BoopSensorProfile) {
    return this.http.put<BoopSensorProfile>(this.apiBaseUrl + "/boop-sensor/profiles/" + profile.id, profile).pipe(catchError(this.defaultErrorHandler));
  }

  getProfileById(id: string) {
    return this.http.get<BoopSensorProfile>(this.apiBaseUrl + "/boop-sensor/profiles/" + id).pipe(catchError((err: HttpErrorResponse) => {
      if (err.status === 404) {
        return of(null);
      }
      throw err;
    }), catchError(this.defaultErrorHandler));
  }

  getActiveProfile() {
    return this.http.get<BoopSensorProfile | null>(this.apiBaseUrl + "/boop-sensor/profiles/active").pipe(catchError((err: HttpErrorResponse) => {
      if (err.status === 404) {
        return of(null);
      }
      throw err;
    }), catchError(this.defaultErrorHandler));
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
}

export interface BoopSensorInfo {
  lastTrigger: number;
  activeProfileId: string;
  state: boolean;
  enabled: boolean;
  boopCounter: number;
  showOnHud: boolean;
}
