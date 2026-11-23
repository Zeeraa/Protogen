import { resolve } from "path";
import { Protogen } from "../Protogen";
import { DosboxApplication } from "./DosboxApplication";
import { existsSync, mkdirSync } from "fs";
import { DosboxApplicationType } from "./DosboxApplicationType";
import { spawn } from "child_process";
import { getErrorMessage } from "../utils/Utils";
import { WrappedDosboxApp } from "../apps/dosbox/WrappedDosboxApp";

export class DosboxManager {
  private readonly protogen: Protogen;
  public readonly cDrivePath: string;
  private _runningApplication: DosboxApplication | null = null;
  private _dosboxProcess: ReturnType<typeof spawn> | null = null;
  private _dosboxApplications: DosboxApplication[] = [];
  private _exitCallbackHandler: (() => void) | null = null;

  constructor(protogen: Protogen) {
    this.protogen = protogen;
    this.cDrivePath = resolve(protogen.config.dataDirectory + "/dosbox/c")

    if (!existsSync(this.cDrivePath)) {
      mkdirSync(this.cDrivePath, { recursive: true });
    }
  }

  public async loadApplications() {
    this._dosboxApplications = [];
    this._dosboxApplications.push(new DosboxApplication(this, this.protogen, DosboxApplicationType.SystemApp, "dosbox", null, "DOSBox", []));
    this.registerApplicationWrappers();
  }

  public async registerApplicationWrappers() {
    // Get list of all existing apps since we need to unregister them
    const allApplicationWrappers = [...this.protogen.appManager.apps]
      .filter(app => app instanceof WrappedDosboxApp);

    allApplicationWrappers.forEach(app => {
      this.protogen.appManager.unregisterApp(app);
    });

    // Construct wrappers
    this._dosboxApplications.forEach(dosboxApp => {
      const wrapper = new WrappedDosboxApp(this.protogen.appManager, dosboxApp);
      this.protogen.appManager.registerApp(wrapper);
    });
  }

  public get dosboxApplications() {
    return this._dosboxApplications;
  }

  private runExitCallbackHandler() {
    try {
      this._exitCallbackHandler?.();
    } catch (error) {
      console.error(error);
      this.protogen.logger.error("DosboxManager", "Error running exit callback handler: " + getErrorMessage(error));
    }
  }

  public kill(): boolean {
    if (this._dosboxProcess) {
      this.protogen.logger.info("DosboxManager", "Killing DOSBox process");
      this._dosboxProcess.kill();
      this._runningApplication = null;
      this._dosboxProcess = null;
      return true;
    }
    return false;
  }

  public launch(dosboxApp: DosboxApplication, maintenanceMode: boolean) {
    try {
      const commandlineFull: string[] = [];

      commandlineFull.push(...dosboxApp.generateCommandLine(!maintenanceMode));

      this._runningApplication = dosboxApp;
      this.protogen.logger.info("DosboxManager", "Launching DOSBox application: " + dosboxApp.name + ". Commandline: " + commandlineFull.join(" "));
      this._dosboxProcess = spawn("dosbox", commandlineFull, { stdio: ["ignore", "inherit", "inherit"] });
      this._dosboxProcess.on("exit", () => {
        this._runningApplication = null;
        this._dosboxProcess = null;
        this.runExitCallbackHandler();
      });

    } catch (error) {
      this._runningApplication = null;
      this.protogen.logger.error("DosboxManager", "Error launching DOSBox application: " + getErrorMessage(error));
      throw error;
    }
  }

  public setExitCallbackHandler(callback: () => void) {
    this._exitCallbackHandler = callback;
  }

  public get runningApplication() {
    return this._runningApplication;
  }
}