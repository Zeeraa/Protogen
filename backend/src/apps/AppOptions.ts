export interface AppOptions {
  /**
   * If true the app will lock rendering by other visor renderers and draw the content of the app canvas to the visor
   */
  useRenderer?: boolean;
  /**
   * If true a render lock will be added when the app is activated and removed when the app is deactivated
   */
  useRenderLock?: boolean;
}