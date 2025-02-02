import { RemoteControlInputType } from "../database/models/remote/RemoteControlInputType";

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

export function constructRemoteStateFromSensorData(data: any): RemoteState {
  return {
    state: data.joystick_state,
    joystickX: data.joystick_x,
    joystickY: data.joystick_y,
    joystickPressed: data.joystick_pressed,
    buttonA: data.button_a,
    buttonLeft: data.button_left,
    buttonRight: data.button_right,
    activeProfileId: data.active_profile_id,
  }
}