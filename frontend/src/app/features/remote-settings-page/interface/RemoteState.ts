export function blankRemoteState() {
  return {
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
  joystickX: number;
  joystickY: number;
  joystickPressed: boolean;
  buttonLeft: boolean;
  buttonRight: boolean;
  buttonA: boolean;
  activeProfileId: number;
}
