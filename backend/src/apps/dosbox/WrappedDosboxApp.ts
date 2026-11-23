import { DosboxApplication } from "../../dosbox/DosboxApplication";
import { AbstractApp, AppAdditionalButtonEnableRule, AppAdditionalButtonType } from "../AbstractApp";
import { AppManager } from "../AppManager";
import { CanvasRenderingContext2D } from "canvas";

export class WrappedDosboxApp extends AbstractApp {
  private readonly dosboxApp: DosboxApplication;
  private _frameImageData: ReturnType<CanvasRenderingContext2D["createImageData"]> | null = null;

  constructor(appManager: AppManager, dosboxApp: DosboxApplication) {
    super(appManager, "dosbox_" + dosboxApp.name, dosboxApp.displayName, { useRenderer: true, useRenderLock: true, webPath: "/apps/dosbox/" + dosboxApp.name });
    this.dosboxApp = dosboxApp;
    if (dosboxApp.allowMaintenanceMode) {
      this.additionalButtons.push({
        type: AppAdditionalButtonType.StartWithParams,
        style: "btn-secondary",
        text: "Maintenance",
        enableRule: AppAdditionalButtonEnableRule.WhenInactive,
        metadata: {
          maintenance: true
        }
      });
    }
  }

  async onInit() {
    this.clearCanvas();
  }

  public async onActivated(params: Record<string, any>) {
    this.clearCanvas();
    this.regenerateInteractionKey();

    const maintenanceMode = params?.maintenance === true;

    try {
      // When process exits deactivate the current app
      this.protogen.dosboxManager.setExitCallbackHandler(() => {
        this.deactivateSelf();
      });

      //TODO: figure out maintenance mode
      await this.protogen.dosboxManager.launch(this.dosboxApp, maintenanceMode);
      this.protogen.logger.info("DosBoxApp", "Launched DOSBox app: " + this.dosboxApp.name);
    } catch (error) {
      console.error(error);
      this.protogen.logger.error("DosBoxApp", "Failed to launch");
    }
  }

  public async onDeactivated() {
    this.protogen.dosboxManager.kill();
  }

  public onVisorRenderTick(): void {
    const frameBuffer = this.protogen.dosboxManager.frameBuffer;
    if (!frameBuffer) {
      return;
    }

    const { width, height } = this.protogen.config.ledMatrix;
    const panelWidth = width / 2;
    this._frameImageData ??= this.appCanvasCtx.createImageData(panelWidth, height);
    for (let sourceOffset = 0, targetOffset = 0; sourceOffset < frameBuffer.length; sourceOffset += 3, targetOffset += 4) {
      this._frameImageData.data[targetOffset] = frameBuffer[sourceOffset];
      this._frameImageData.data[targetOffset + 1] = frameBuffer[sourceOffset + 1];
      this._frameImageData.data[targetOffset + 2] = frameBuffer[sourceOffset + 2];
      this._frameImageData.data[targetOffset + 3] = 255;
    }
    this.appCanvasCtx.putImageData(this._frameImageData, 0, 0);
    this.appCanvasCtx.putImageData(this._frameImageData, panelWidth, 0);
  }
}
