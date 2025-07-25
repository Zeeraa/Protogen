export enum ActionType {
  /**
   * Blank action that does nothing.
   * This can be used as a placeholder or to indicate no action.
   */
  NONE = "NONE",
  /**
   * Activatesthe visor renderer with the specified ID.
   * The action parameter should be the ID of the renderer to activate.
   */
  ACTIVATE_VISOR_RENDERER = "ACTIVATE_VISOR_RENDERER",
  /**
   * Activates the RGB scene with the specified ID.
   * The action parameter should be the ID of the RGB scene to activate.
   */
  ACTIVATE_RGB_SCENE = "ACTIVATE_RGB_SCENE",
  /**
   * Plays a video.
   * The action parameter should be the ID of a saved video.
   */
  PLAY_VIDEO = "PLAY_VIDEO",
  /**
   * Sets the face expression.
   * The action parameter should be the ID of the face expression to set.
   */
  FACE_EXPRESSION = "FACE_EXPRESSION",
  /**
   * Activates the RGB effect for the face.
   * The action parameter should be the ID of the RGB effect to activate.
   */
  ACTIVATE_FACE_RGB_EFFECT = "ACTIVATE_FACE_RGB_EFFECT",
  /**
   * Disables the RGB effects.
   * No action or metadata is required.
   */
  DISABLE_RGB = "DISABLE_RGB",
  /**
   * Stops video playback.
   * No action or metadata is required.
   */
  STOP_VIDEO = "STOP_VIDEO",
  /**
   * Runs an action set by its ID.
   * The action parameter should be the ID of the action set to run.
   */
  RUN_ACTION_SET = "RUN_ACTION_SET",
  /**
   * Resets the boop sensor counter.
   * No action or metadata is required.
   */
  RESET_BOOP_SENSOR_COUNTER = "RESET_BOOP_SENSOR_COUNTER",
  /**
   * Toggles the boop sensor.
   * No action or metadata is required.
   */
  TOGGLE_BOOP_SENSOR = "TOGGLE_BOOP_SENSOR",
  /**
   * Sets a temporary face expression.
   * The action parameter should be the ID of the face expression to set.
   * Metadata should be the duration to keep the expression active in seconds.
   */
  TEMPORARY_EXPRESSION = "TEMPORARY_EXPRESSION",
}
