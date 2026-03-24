export interface GamepadState {
  connected: boolean;
  name: string;
  buttons: GamepadButtons;
  axes: GamepadAxes;
}

export enum GamepadActionTriggers {
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
