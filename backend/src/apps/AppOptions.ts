/**
 * Additional option for apps
 */
export interface AppOptions {
  /**
   * If true the app will lock rendering by other visor renderers and draw the content of the app canvas to the visor
   */
  useRenderer?: boolean;

  /**
   * If true a render lock will be added when the app is activated and removed when the app is deactivated
   */
  useRenderLock?: boolean;

  /**
   * Path used for this app in the web interface that users can visit to interact with the app. If not defined the app will not have a user interface
   */
  webPath?: string;
}
