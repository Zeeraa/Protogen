import { Protogen } from "../Protogen";
import { AbstractApp } from "./AbstractApp";

export const AppRenderLockName = "App";

export class AppManager {
  private readonly _protogen;
  private readonly _apps: AbstractApp[] = [];
  private _activeApp: AbstractApp | null = null;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  public get protogen() {
    return this._protogen;
  }

  public get apps() {
    return this._apps;
  }

  public get activeApp() {
    return this._activeApp;
  }

  public get appRunning() {
    return this._activeApp !== null;
  }

  public getAppByName(name: string): AbstractApp | null {
    const app = this._apps.find((app) => app.name === name);
    return app || null;
  }

  public registerApp(app: AbstractApp) {
    if (this.getAppByName(app.name) != null) {
      throw new Error(`App ${app.name} already registered`);
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(app.name)) {
      throw new Error(`App name ${app.name} is invalid`);
    }

    if (app.name.length > 64) {
      throw new Error(`App name ${app.name} is too long`);
    }

    if (app.name === "active") {
      throw new Error(`App name ${app.name} is reserved`);
    }

    this._apps.push(app);
    this.protogen.logger.info("AppManager", `Registered app ${app.name}`);
  }

  public activateApp(name: string) {
    const app = this.getAppByName(name);
    if (!app) {
      throw new Error(`App ${name} not found`);
    }

    if (this.appRunning) {
      this.deactivateApp();
    }

    try {
      this._activeApp = app;
      if (app.options.useRenderLock || app.options.useRenderer) {
        this.protogen.visor.appendRenderLock(AppRenderLockName);
      }
      this._activeApp.onActivated();
      return true;
    } catch (err) {
      console.error(err);
      this.protogen.logger.error("AppManager", "Error activating app " + app.name);
      this.deactivateApp();
    }
    return false;
  }

  public deactivateApp() {
    this.protogen.visor.removeRenderLock(AppRenderLockName);

    if (this._activeApp) {
      try {
        this._activeApp.onDeactivated();
        this._activeApp = null;
        return true;
      } catch (err) {
        console.error(err);
        this.protogen.logger.error("AppManager", "Error deactivating app " + this._activeApp?.name);
      }
      this._activeApp = null;
      return false;
    }
  }
}