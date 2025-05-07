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

    //TODO: remove debug code
    for (let i = 0; i < 100; i++) {
      const x = Math.floor(Math.random() * this.appCanvas.width);
      const y = Math.floor(Math.random() * this.appCanvas.height);
      const hue = Math.floor(Math.random() * 360);
      this.appCanvasCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      this.appCanvasCtx.fillRect(x, y, 1, 1);
    }
  }

  public getMetadata() {
    const imageB64 = this.appCanvas.toDataURL("image/png");

    return {
      canvas: {
        width: this.appCanvas.width,
        height: this.appCanvas.height,
      },
      image: imageB64,
    }
  }
}
