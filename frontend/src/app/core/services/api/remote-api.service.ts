import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError } from 'rxjs';

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
  actionType: RemoteControlActionType;
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
  actionType: RemoteControlActionType;
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

export enum RemoteControlActionType {
  NONE = "NONE",
  ACTIVATE_VISOR_RENDERER = "ACTIVATE_VISOR_RENDERER",
  ACTIVATE_RGB_SCENE = "ACTIVATE_RGB_SCENE",
  PLAY_VIDEO = "PLAY_VIDEO",
  FACE_EXPRESSION = "FACE_EXPRESSION",
  ACTIVATE_FACE_RGB_EFFECT = "ACTIVATE_FACE_RGB_EFFECT",
  DISABLE_RGB = "DISABLE_RGB",
  STOP_VIDEO = "STOP_VIDEO",
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

export function translateRemoteActionType(type: RemoteControlActionType) {
  switch (type) {
    case RemoteControlActionType.NONE:
      return "None";

    case RemoteControlActionType.ACTIVATE_RGB_SCENE:
      return "Set RGB scene";

    case RemoteControlActionType.ACTIVATE_VISOR_RENDERER:
      return "Activate visor renderer";

    case RemoteControlActionType.FACE_EXPRESSION:
      return "Face expression";

    case RemoteControlActionType.ACTIVATE_FACE_RGB_EFFECT:
      return "Activate face RGB effect";

    case RemoteControlActionType.PLAY_VIDEO:
      return "Play video";

    case RemoteControlActionType.DISABLE_RGB:
      return "Disable RGB";

    case RemoteControlActionType.STOP_VIDEO:
      return "Stop video";

    default:
      return "Unknown";
  }
}
