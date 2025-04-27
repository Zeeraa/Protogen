import { AbstractApp } from "../AbstractApp";
import { AppManager } from "../AppManager";

export class TestApp extends AbstractApp {
  constructor(appManager: AppManager) {
    super(appManager, "test", "Test App", { useRenderer: true });
  }

  onActivated() {
    this.protogen.logger.info("TestApp", "Test app activated");
  }

  onDeactivated() {
    this.protogen.logger.info("TestApp", "Test app deactivated");
  }

  public onVisorRenderTick(): void {
    this.appCanvasCtx.fillStyle = "blue";
    this.appCanvasCtx.fillRect(0, 0, this.appCanvas.width, this.appCanvas.height);
  }
}