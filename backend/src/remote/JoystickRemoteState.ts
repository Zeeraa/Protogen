import { JoystickRemoteControlInputType } from "../database/models/remote/joystick/JoystickRemoteControlInputType";

export interface RemoteState {
  state: JoystickRemoteControlInputType;
  joystickX: number;
  joystickY: number;
  joystickPressed: boolean;
  buttonLeft: boolean;
  buttonRight: boolean;
  buttonA: boolean;
  activeProfileId: number;
}

export function constructJoystickRemoteStateFromSensorData(data: any): RemoteState {
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
