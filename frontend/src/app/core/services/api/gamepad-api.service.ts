import { Injectable } from "@angular/core";
import { ApiBaseService } from "../api-base.service";
import { HttpErrorResponse } from "@angular/common/http";
import { catchError, of } from "rxjs";
import { ActionType } from "../../enum/ActionType";

@Injectable({
  providedIn: 'root'
})
export class GamepadApiService extends ApiBaseService {
  public getSettings() {
    return this.http.get<GamepadSettings>(this.apiBaseUrl + "/gamepad/settings");
  }

  public setSettings(settings: GamepadSettings) {
    return this.http.post<GamepadSettings>(this.apiBaseUrl + "/gamepad/settings", settings);
  }

  public getProfiles() {
    return this.http.get<GamepadProfile[]>(this.apiBaseUrl + "/gamepad/profiles");
  }

  public createProfile(name: string) {
    return this.http.post<GamepadProfile>(this.apiBaseUrl + "/gamepad/profiles", { name });
  }

  public getActiveProfile() {
    return this.http.get<GamepadProfile>(this.apiBaseUrl + "/gamepad/profiles/active").pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }

  public deactivateProfile() {
    return this.http.delete(this.apiBaseUrl + "/gamepad/profiles/active");
  }

  public activateProfile(id: string) {
    return this.http.post<GamepadProfile>(this.apiBaseUrl + "/gamepad/profiles/" + id + "/activate", {});
  }

  public getProfileById(id: string) {
    return this.http.get<GamepadProfile>(this.apiBaseUrl + "/gamepad/profiles/" + id).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }

  public updateProfile(id: string, name: string, actions: UpdateProfileActionInput[]) {
    return this.http.put<GamepadProfile>(this.apiBaseUrl + "/gamepad/profiles/" + id, { name, actions });
  }

  public deleteProfile(id: string) {
    return this.http.delete(this.apiBaseUrl + "/gamepad/profiles/" + id);
  }
}

export interface GamepadSettings {
  type: ControllerType;
  enablePreview: boolean;
}

export enum ControllerType {
  PLAYSTATION = "playstation",
  XBOX = "xbox",
}

export interface GamepadProfile {
  id: string;
  name: string;
  actions: GamepadProfileAction[];
}

export interface GamepadProfileAction {
  id: string;
  trigger: GamepadActionTrigger;
  actionType: ActionType;
  action: string | null;
}

export interface UpdateProfileActionInput {
  trigger: GamepadActionTrigger;
  actionType: ActionType;
  action: string | null;
}

export { ActionType };

export enum GamepadActionTrigger {
  BUTTON_A = "BUTTON_A",
  BUTTON_B = "BUTTON_B",
  BUTTON_X = "BUTTON_X",
  BUTTON_Y = "BUTTON_Y",
  BUTTON_LB = "BUTTON_LB",
  BUTTON_RB = "BUTTON_RB",
  BUTTON_SELECT = "BUTTON_SELECT",
  BUTTON_START = "BUTTON_START",
  BUTTON_HOME = "BUTTON_HOME",
  DPAD_UP = "DPAD_UP",
  DPAD_DOWN = "DPAD_DOWN",
  DPAD_LEFT = "DPAD_LEFT",
  DPAD_RIGHT = "DPAD_RIGHT",
  LEFT_STICK_UP = "LEFT_STICK_UP",
  LEFT_STICK_DOWN = "LEFT_STICK_DOWN",
  LEFT_STICK_LEFT = "LEFT_STICK_LEFT",
  LEFT_STICK_RIGHT = "LEFT_STICK_RIGHT",
  LEFT_STICK_CENTER = "LEFT_STICK_CENTER",
  RIGHT_STICK_UP = "RIGHT_STICK_UP",
  RIGHT_STICK_DOWN = "RIGHT_STICK_DOWN",
  RIGHT_STICK_LEFT = "RIGHT_STICK_LEFT",
  RIGHT_STICK_RIGHT = "RIGHT_STICK_RIGHT",
  RIGHT_STICK_CENTER = "RIGHT_STICK_CENTER",
  RIGHT_TRIGGER_DOWN = "RIGHT_TRIGGER_DOWN",
  LEFT_TRIGGER_DOWN = "LEFT_TRIGGER_DOWN",
}

export function translateTriggerName(trigger: GamepadActionTrigger): string {
  switch (trigger) {
    case GamepadActionTrigger.BUTTON_A: return "Button A";
    case GamepadActionTrigger.BUTTON_B: return "Button B";
    case GamepadActionTrigger.BUTTON_X: return "Button X";
    case GamepadActionTrigger.BUTTON_Y: return "Button Y";
    case GamepadActionTrigger.BUTTON_LB: return "Left Bumper (LB)";
    case GamepadActionTrigger.BUTTON_RB: return "Right Bumper (RB)";
    case GamepadActionTrigger.BUTTON_SELECT: return "Select";
    case GamepadActionTrigger.BUTTON_START: return "Start";
    case GamepadActionTrigger.BUTTON_HOME: return "Home";
    case GamepadActionTrigger.DPAD_UP: return "D-pad Up";
    case GamepadActionTrigger.DPAD_DOWN: return "D-pad Down";
    case GamepadActionTrigger.DPAD_LEFT: return "D-pad Left";
    case GamepadActionTrigger.DPAD_RIGHT: return "D-pad Right";
    case GamepadActionTrigger.LEFT_STICK_UP: return "Left Stick Up";
    case GamepadActionTrigger.LEFT_STICK_DOWN: return "Left Stick Down";
    case GamepadActionTrigger.LEFT_STICK_LEFT: return "Left Stick Left";
    case GamepadActionTrigger.LEFT_STICK_RIGHT: return "Left Stick Right";
    case GamepadActionTrigger.LEFT_STICK_CENTER: return "Left Stick Center";
    case GamepadActionTrigger.RIGHT_STICK_UP: return "Right Stick Up";
    case GamepadActionTrigger.RIGHT_STICK_DOWN: return "Right Stick Down";
    case GamepadActionTrigger.RIGHT_STICK_LEFT: return "Right Stick Left";
    case GamepadActionTrigger.RIGHT_STICK_RIGHT: return "Right Stick Right";
    case GamepadActionTrigger.RIGHT_STICK_CENTER: return "Right Stick Center";
    case GamepadActionTrigger.RIGHT_TRIGGER_DOWN: return "Right Trigger";
    case GamepadActionTrigger.LEFT_TRIGGER_DOWN: return "Left Trigger";
    default: return trigger;
  }
}
