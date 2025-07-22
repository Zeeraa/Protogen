import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError } from 'rxjs';
import { ActionType } from '../../enum/ActionType';

@Injectable({
  providedIn: 'root'
})
export class JoystickRemoteApiService extends ApiBaseService {
  getProfiles() {
    return this.http.get<JoystickRemoteProfile[]>(this.apiBaseUrl + "/remote/joystick/profiles").pipe(catchError(this.defaultErrorHandler));
  }

  createProfile(data: JoystickAlterProfileDTO) {
    return this.http.post<JoystickRemoteProfile>(this.apiBaseUrl + "/remote/joystick/profiles", data).pipe(catchError(this.defaultErrorHandler));
  }

  alterProfile(id: number, data: JoystickAlterProfileDTO) {
    return this.http.put<JoystickRemoteProfile>(this.apiBaseUrl + "/remote/joystick/profiles/" + id, data).pipe(catchError(this.defaultErrorHandler));
  }

  deleteProfile(id: number) {
    return this.http.delete(this.apiBaseUrl + "/remote/joystick/profiles/" + id).pipe(catchError(this.defaultErrorHandler));
  }

  alterConfig(data: JoystickRemoteAlterConfigDTO) {
    return this.http.put<JoystickRemoteConfig>(this.apiBaseUrl + "/remote/joystick/config", data).pipe(catchError(this.defaultErrorHandler));
  }

  getConfig() {
    return this.http.get<JoystickRemoteConfig>(this.apiBaseUrl + "/remote/joystick/config").pipe(catchError(this.defaultErrorHandler));
  }
}

export interface JoystickRemoteAlterConfigDTO {
  invertX?: boolean;
  invertY?: boolean;
  flipAxis?: boolean;
}

export interface JoystickRemoteConfig {
  invertX: boolean;
  invertY: boolean;
  flipAxis: boolean;
}

export interface JoystickAlterProfileActions {
  id: number | undefined;
  actionType: ActionType;
  action: string | null;
  metadata: string | null;
  inputType: JoystickRemoteControlInputType;
}

export interface JoystickAlterProfileDTO {
  name: string;
  clickToActivate: boolean;
  actions: JoystickAlterProfileActions[];
}

export interface JoystickRemoteProfile {
  id: number;
  name: string;
  clickToActivate: boolean;
  actions: JoystickRemoteAction[];
  lastSaveDate: string;
}

export interface JoystickRemoteAction {
  id: number;
  inputType: JoystickRemoteControlInputType;
  actionType: ActionType;
  action: any;
  metadata: string | null;
}

export enum JoystickRemoteControlInputType {
  JOYSTICK_UP = "JOYSTICK_UP",
  JOYSTICK_DOWN = "JOYSTICK_DOWN",
  JOYSTICK_LEFT = "JOYSTICK_LEFT",
  JOYSTICK_RIGHT = "JOYSTICK_RIGHT",
  JOYSTICK_CENTER = "JOYSTICK_CENTER",
  JOYSTICK_BUTTON = "JOYSTICK_BUTTON",
  BUTTON_1 = "BUTTON_1",
}

export function translateRemoteInputType(type: JoystickRemoteControlInputType) {
  switch (type) {
    case JoystickRemoteControlInputType.JOYSTICK_UP:
      return "Joystick Up";

    case JoystickRemoteControlInputType.JOYSTICK_DOWN:
      return "Joystick Down";

    case JoystickRemoteControlInputType.JOYSTICK_LEFT:
      return "Joystick Left";

    case JoystickRemoteControlInputType.JOYSTICK_RIGHT:
      return "Joystick Right";

    case JoystickRemoteControlInputType.JOYSTICK_CENTER:
      return "Joystick Center";

    case JoystickRemoteControlInputType.JOYSTICK_BUTTON:
      return "Joystick Press";

    case JoystickRemoteControlInputType.BUTTON_1:
      return "Button 1";

    default:
      return "Unknown";
  }
}
