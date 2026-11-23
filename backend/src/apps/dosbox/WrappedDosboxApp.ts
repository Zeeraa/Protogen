import { DosboxApplication } from "../../dosbox/DosboxApplication";
import { AbstractApp } from "../AbstractApp";
import { AppManager } from "../AppManager";

export class WrappedDosboxApp extends AbstractApp {
  private readonly dosboxApp: DosboxApplication;

  constructor(appManager: AppManager, dosboxApp: DosboxApplication) {
    super(appManager, "dosbox_" + dosboxApp.name, dosboxApp.displayName, { useRenderLock: true });
    this.dosboxApp = dosboxApp;
  }

  public async onActivated() {
    try {
      // When process exits deactivate the current app
      this.protogen.dosboxManager.setExitCallbackHandler(() => {
        this.deactivateSelf();
      });

      //TODO: figure out maintenance mode
      this.protogen.dosboxManager.launch(this.dosboxApp, false);
      this.protogen.logger.info("DosBoxApp", "Launched DOSBox app: " + this.dosboxApp.name);
    } catch (error) {
      console.error(error);
      this.protogen.logger.error("DosBoxApp", "Failed to launch");
    }
  }

  public async onDeactivated() {
    this.protogen.dosboxManager.kill();
  }
}