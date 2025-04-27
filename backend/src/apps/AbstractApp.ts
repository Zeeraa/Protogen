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

  constructor(appManager: AppManager, name: string, displayName: string, options: AppOptions = {}) {
    this._appManager = appManager;
    this._name = name;
    this._displayName = displayName;
    this._options = options;

    // Setup the app canvas
    const { width, height } = this.protogen.config.ledMatrix;
    this._appCanvas = createCanvas(width, height);
    this._appCanvasCtx = this.appCanvas.getContext("2d");

    // Clear the canvas
    this.appCanvasCtx.fillStyle = "black";
    this.appCanvasCtx.fillRect(0, 0, width, height);
  }

  protected get appManager() {
    return this._appManager;
  }

  protected get protogen() {
    return this.appManager.protogen;
  }

  public get name() {
    return this._name;
  }

  public get displayName() {
    return this._displayName;
  }

  public get options() {
    return this._options;
  }

  public get isActive() {
    return this.appManager.activeApp?.name === this.name;
  }

  public get appCanvas() {
    return this._appCanvas;
  }

  public get appCanvasCtx() {
    return this._appCanvasCtx;
  }

  /**
   * Called each tick when the visor tries to render a frame. Only called if the app is active and useRenderer is enabled in options
   */
  public onVisorRenderTick() {
  }

  /**
   * Called when the app is activated
   */
  public onActivated() {
  }

  /**
   * Called when the app is deactivated
   */
  public onDeactivated() {
  }

  /**
   * Activates the app if its not already active
   */
  public activate() {
    this.appManager.activateApp(this.name);
  }

  /**
   * Deactivates self if active
   */
  public deactivateSelf() {
    if (this.isActive) {
      this.appManager.deactivateApp();
    }
  }

  /**
   * Deactivates any active app
   */
  public deactivateAny() {
    this.appManager.deactivateApp();
  }
}