import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RemoteApiService extends ApiBaseService {
  getProfiles(): Observable<RemoteProfile[]> {
    return this.http.get(this.apiBaseUrl + "/remote/profiles").pipe(catchError(this.defaultErrorHandler)) as any as Observable<RemoteProfile[]>;
  }

  createProfile(data: AlterProfileDTO): Observable<RemoteProfile> {
    return this.http.post(this.apiBaseUrl + "/remote/profiles", data).pipe(catchError(this.defaultErrorHandler)) as any as Observable<RemoteProfile>;
  }

  alterProfile(id: number, data: AlterProfileDTO): Observable<RemoteProfile> {
    return this.http.put(this.apiBaseUrl + "/remote/profiles/" + id, data).pipe(catchError(this.defaultErrorHandler)) as any as Observable<RemoteProfile>;
  }

  deleteProfile(id: number): Observable<any> {
    return this.http.delete(this.apiBaseUrl + "/remote/profiles/" + id).pipe(catchError(this.defaultErrorHandler)) as any as Observable<any>;
  }

  alterConfig(data: AlterConfigDTO): Observable<RemoteConfig> {
    return this.http.put(this.apiBaseUrl + "/remote/config", data).pipe(catchError(this.defaultErrorHandler)) as any as Observable<RemoteConfig>;
  }
}

export interface AlterConfigDTO {
  invertX?: boolean,
  invertY?: boolean,
  flipAxis?: boolean,
}

export interface RemoteConfig {

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
