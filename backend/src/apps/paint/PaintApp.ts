import { AbstractApp } from "../AbstractApp";
import { AppManager } from "../AppManager";

/**
 * An app where you can invite users to draw on your screen
 */
export class PaintApp extends AbstractApp {
  constructor(appManager: AppManager) {
    super(appManager, "paint", "Paint", { useRenderer: true, webPath: "/apps/paint" });
  }

  async onInit() {
    this.clearCanvas();
  }

  async onActivated() {
    this.clearCanvas();
    this.regenerateInteractionKey();
  }

  clearCanvas() {
    this.appCanvasCtx.fillStyle = "black";
    this.appCanvasCtx.fillRect(0, 0, this.appCanvas.width, this.appCanvas.height);
  }

  public getMetadata() {
    return {
      canvas: {
        width: this.appCanvas.width,
        height: this.appCanvas.height,
      }
    }
  }
}
