import { RemoteControlInputType } from "../../../core/services/api/remote-api.service";

export function blankRemoteState() {
  return {
    state: RemoteControlInputType.JOYSTICK_CENTER,
    activeProfileId: -1,
    buttonA: false,
    buttonLeft: false,
    buttonRight: false,
    joystickPressed: false,
    joystickX: 0.5,
    joystickY: 0.5,
  }
}

export interface RemoteState {
  state: RemoteControlInputType;
  joystickX: number;
  joystickY: number;
  joystickPressed: boolean;
  buttonLeft: boolean;
  buttonRight: boolean;
  buttonA: boolean;
  activeProfileId: number;
}
