export enum ActionType {
  NONE = "NONE",
  ACTIVATE_VISOR_RENDERER = "ACTIVATE_VISOR_RENDERER",
  ACTIVATE_RGB_SCENE = "ACTIVATE_RGB_SCENE",
  PLAY_VIDEO = "PLAY_VIDEO",
  FACE_EXPRESSION = "FACE_EXPRESSION",
  ACTIVATE_FACE_RGB_EFFECT = "ACTIVATE_FACE_RGB_EFFECT",
  DISABLE_RGB = "DISABLE_RGB",
  STOP_VIDEO = "STOP_VIDEO",
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

    default:
      return "Unknown";
  }
}
