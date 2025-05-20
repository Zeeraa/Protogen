import { generateSecretKey } from "../utils/Utils";
import { AppSocketPacket } from "../webserver/socket/AppUserSocketSession";
import { AppManager } from "./AppManager";
import { AppOptions } from "./AppOptions";
import { createCanvas } from "canvas";

export abstract class AbstractApp {
  private readonly _appManager;
  private readonly _name;
  private _displayName;
  private readonly _options;
  private readonly _appCanvas;
  private readonly _appCanvasCtx;
  private _interactionKey: string;

  constructor(appManager: AppManager, name: string, displayName: string, options: AppOptions = {}) {
    this._appManager = appManager;
    this._name = name;
    this._displayName = displayName;
    this._options = options;

    this.regenerateInteractionKey();

    // Setup the app canvas
    const { width, height } = this.protogen.config.ledMatrix;
    this._appCanvas = createCanvas(width, height);
    this._appCanvasCtx = this.appCanvas.getContext("2d");

    // Clear the canvas
    this.appCanvasCtx.fillStyle = "black";
    this.appCanvasCtx.fillRect(0, 0, width, height);
  }

  /**
   * Regenerates the interaction key and disconnects all users connected to the app
   */
  public regenerateInteractionKey() {
    this._interactionKey = generateSecretKey(32);
    this.disconnectSocketUsers();
  }

  /**
   * Disconnects all users connected to the app
   */
  public disconnectSocketUsers() {
    this.protogen.webServer.appSocketSessions.filter(s => s.app.name == this.name).forEach(s => {
      this.protogen.webServer.disconnectAppSocket(s);
    });
  }

  /**
   * Returns the interaction key for this app. This key is used to authenticate users connecting to the app
   */
  public get interactionKey() {
    return this._interactionKey;
  }

  /**
   * Returns the app manager
   */
  protected get appManager() {
    return this._appManager;
  }

  /**
   * Returns the protogen instance
   */
  protected get protogen() {
    return this.appManager.protogen;
  }

  /**
   * Returns the name of the app
   */
  public get name() {
    return this._name;
  }

  /**
   * Returns the display name of the app
   */
  public get displayName() {
    return this._displayName;
  }

  /**
   * Get the options for the app
   */
  public get options() {
    return this._options;
  }

  /**
   * Returns true if the app is active
   */
  public get isActive() {
    return this.appManager.activeApp?.name === this.name;
  }


  /**
   * Returns the app canvas
   */
  public get appCanvas() {
    return this._appCanvas;
  }

  /**
   * Returns the app canvas context
   */
  public get appCanvasCtx() {
    return this._appCanvasCtx;
  }

  /**
   * Get metadata for use in ui
   */
  public getMetadata(): any {
    return {};
  }

  /**
   * Called each tick when the visor tries to render a frame. Only called if the app is active and useRenderer is enabled in options
   */
  public onVisorRenderTick() {
  }

  /**
   * Called when the app is activated
   */
  public async onActivated() {
  }

  /**
   * Called when the app is initialized
   */
  public async onInit() {
  }

  /**
   * Called when the app is deactivated
   */
  public async onDeactivated() {
  }

  /**
   * Activates the app if its not already active
   */
  public async activate() {
    await this.appManager.activateApp(this.name);
  }

  /**
   * Deactivates self if active
   */
  public async deactivateSelf() {
    if (this.isActive) {
      await this.appManager.deactivateApp();
    }
  }

  /**
   * Deactivates any active app
   */
  public async deactivateAny() {
    await this.appManager.deactivateApp();
  }

  /**
   * Called when the app receives a message from the web interface. The data object is unfiltered and should not be trusted without input validation
   * @param data Unfiltered data from the user
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async onAppMessage(data: AppSocketPacket<any>) { }
}
