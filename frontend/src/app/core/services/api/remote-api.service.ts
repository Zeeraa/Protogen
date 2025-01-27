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
}

export interface RemoteProfile {
  id: number;
  name: string;
  clickToActivate: boolean;
  actions: RemoteAction[];
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
  JOYSTICK_BUTTON = "JOYSTICK_BUTTON",
  BUTTON_1 = "BUTTON_1",
}

export enum RemoteControlActionType {
  NONE = "NONE",
  ACTIVATE_VISOR_RENDERER = "ACTIVATE_VISOR_RENDERER",
  ACTIVATE_RGB_SCENE = "ACTIVATE_RGB_SCENE",
  PLAY_VIDEO = "PLAY_VIDEO",
  FACE_EXPRESSION = "FACE_EXPRESSION",
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

    default:
      return "Unknown";
  }
}
