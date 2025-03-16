import { JoystickRemoteControlInputType } from "../services/api/joystick-remote-api.service";

export function blankJoystickRemoteState(): JoystickRemoteState {
  return {
    state: JoystickRemoteControlInputType.JOYSTICK_CENTER,
    activeProfileId: -1,
    buttonA: false,
    buttonLeft: false,
    buttonRight: false,
    joystickPressed: false,
    joystickX: 0.5,
    joystickY: 0.5,
  }
}

export interface JoystickRemoteState {
  state: JoystickRemoteControlInputType;
  joystickX: number;
  joystickY: number;
  joystickPressed: boolean;
  buttonLeft: boolean;
  buttonRight: boolean;
  buttonA: boolean;
  activeProfileId: number;
}
