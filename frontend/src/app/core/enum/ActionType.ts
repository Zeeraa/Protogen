export enum ActionType {
  NONE = "NONE",
  ACTIVATE_VISOR_RENDERER = "ACTIVATE_VISOR_RENDERER",
  ACTIVATE_RGB_SCENE = "ACTIVATE_RGB_SCENE",
  PLAY_VIDEO = "PLAY_VIDEO",
  FACE_EXPRESSION = "FACE_EXPRESSION",
  ACTIVATE_FACE_RGB_EFFECT = "ACTIVATE_FACE_RGB_EFFECT",
  DISABLE_RGB = "DISABLE_RGB",
  STOP_VIDEO = "STOP_VIDEO",
  RUN_ACTION_SET = "RUN_ACTION_SET",
  RESET_BOOP_SENSOR_COUNTER = "RESET_BOOP_SENSOR_COUNTER",
  TOGGLE_BOOP_SENSOR = "TOGGLE_BOOP_SENSOR",
}


export function translateActionType(type: ActionType) {
  switch (type) {
    case ActionType.NONE:
      return "None";

    case ActionType.ACTIVATE_RGB_SCENE:
      return "Set RGB scene";

    case ActionType.ACTIVATE_VISOR_RENDERER:
      return "Activate visor renderer";

    case ActionType.FACE_EXPRESSION:
      return "Face expression";

    case ActionType.ACTIVATE_FACE_RGB_EFFECT:
      return "Activate face RGB effect";

    case ActionType.PLAY_VIDEO:
      return "Play video";

    case ActionType.DISABLE_RGB:
      return "Disable RGB";

    case ActionType.STOP_VIDEO:
      return "Stop video";

    case ActionType.RUN_ACTION_SET:
      return "Run action set";

    case ActionType.RESET_BOOP_SENSOR_COUNTER:
      return "Reset boop counter";

    case ActionType.TOGGLE_BOOP_SENSOR:
      return "Toggle boop sensor";

    default:
      return "Unknown";
  }
}
