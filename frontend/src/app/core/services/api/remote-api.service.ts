import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError } from 'rxjs';
import { ActionType } from '../../enum/ActionType';

@Injectable({
  providedIn: 'root'
})
export class RemoteApiService extends ApiBaseService {
  getProfiles() {
    return this.http.get<RemoteProfile[]>(this.apiBaseUrl + "/remote/profiles").pipe(catchError(this.defaultErrorHandler));
  }

  createProfile(data: AlterProfileDTO) {
    return this.http.post<RemoteProfile>(this.apiBaseUrl + "/remote/profiles", data).pipe(catchError(this.defaultErrorHandler));
  }

  alterProfile(id: number, data: AlterProfileDTO) {
    return this.http.put<RemoteProfile>(this.apiBaseUrl + "/remote/profiles/" + id, data).pipe(catchError(this.defaultErrorHandler));
  }

  deleteProfile(id: number) {
    return this.http.delete(this.apiBaseUrl + "/remote/profiles/" + id).pipe(catchError(this.defaultErrorHandler));
  }

  alterConfig(data: AlterConfigDTO) {
    return this.http.put<RemoteConfig>(this.apiBaseUrl + "/remote/config", data).pipe(catchError(this.defaultErrorHandler));
  }

  getConfig() {
    return this.http.get<RemoteConfig>(this.apiBaseUrl + "/remote/config").pipe(catchError(this.defaultErrorHandler));
  }
}

export interface AlterConfigDTO {
  invertX?: boolean;
  invertY?: boolean;
  flipAxis?: boolean;
}

export interface RemoteConfig {
  invertX: boolean;
  invertY: boolean;
  flipAxis: boolean;
}

export interface AlterProfileActions {
  id: number | undefined;
  actionType: ActionType;
  action: string | null;
  inputType: RemoteControlInputType;
}

export interface AlterProfileDTO {
  name: string;
  clickToActivate: boolean;
  actions: AlterProfileActions[];
}

export interface RemoteProfile {
  id: number;
  name: string;
  clickToActivate: boolean;
  actions: RemoteAction[];
  lastSaveDate: string;
}

export interface RemoteAction {
  id: number;
  inputType: RemoteControlInputType;
  actionType: ActionType;
  action: any;
}

export enum RemoteControlInputType {
  JOYSTICK_UP = "JOYSTICK_UP",
  JOYSTICK_DOWN = "JOYSTICK_DOWN",
  JOYSTICK_LEFT = "JOYSTICK_LEFT",
  JOYSTICK_RIGHT = "JOYSTICK_RIGHT",
  JOYSTICK_CENTER = "JOYSTICK_CENTER",
  JOYSTICK_BUTTON = "JOYSTICK_BUTTON",
  BUTTON_1 = "BUTTON_1",
}

export function translateRemoteInputType(type: RemoteControlInputType) {
  switch (type) {
    case RemoteControlInputType.JOYSTICK_UP:
      return "Joystick Up";

    case RemoteControlInputType.JOYSTICK_DOWN:
      return "Joystick Down";

    case RemoteControlInputType.JOYSTICK_LEFT:
      return "Joystick Left";

    case RemoteControlInputType.JOYSTICK_RIGHT:
      return "Joystick Right";

    case RemoteControlInputType.JOYSTICK_CENTER:
      return "Joystick Center";

    case RemoteControlInputType.JOYSTICK_BUTTON:
      return "Joystick Press";

    case RemoteControlInputType.BUTTON_1:
      return "Button 1";

    default:
      return "Unknown";
  }
}
