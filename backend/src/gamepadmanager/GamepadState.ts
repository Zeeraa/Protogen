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

export interface GamepadStatusMessage {
  connected: boolean;
  name: string;
}

export interface GamepadButtonMessage {
  code: string;
  name: string;
  pressed: boolean;
}

export interface GamepadAxesMessage {
  axes: Record<string, number>;
}
