import { Injectable } from "@angular/core";
import { ApiBaseService } from "../api-base.service";

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
}

export interface GamepadSettings {
  type: ControllerType;
  enablePreview: boolean;
}

export enum ControllerType {
  PLAYSTATION = "playstation",
  XBOX = "xbox",
}