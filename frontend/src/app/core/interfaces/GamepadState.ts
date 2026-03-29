export interface GamepadState {
  connected: boolean;
  name: string;
  buttons: GamepadButtons;
  axes: GamepadAxes;
}

export interface GamepadButtons {
  A: boolean;
  B: boolean;
  X: boolean;
  Y: boolean;
  LB: boolean;
  RB: boolean;
  SELECT: boolean;
  START: boolean;
  HOME: boolean;
  LS: boolean;
  RS: boolean;
}

export interface GamepadAxes {
  LEFT_X: number;
  LEFT_Y: number;
  RIGHT_X: number;
  RIGHT_Y: number;
  LT: number;
  RT: number;
  DPAD_X: number;
  DPAD_Y: number;
}

export function emptyGamepadState(): GamepadState {
  return {
    connected: false,
    name: '',
    buttons: {
      A: false,
      B: false,
      X: false,
      Y: false,
      LB: false,
      RB: false,
      SELECT: false,
      START: false,
      HOME: false,
      LS: false,
      RS: false,
    },
    axes: {
      LEFT_X: 0,
      LEFT_Y: 0,
      RIGHT_X: 0,
      RIGHT_Y: 0,
      LT: 0,
      RT: 0,
      DPAD_X: 0,
      DPAD_Y: 0,
    },
  };
}