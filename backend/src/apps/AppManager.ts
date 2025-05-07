import { existsSync, readFileSync, writeFileSync } from "fs";
import { JwtKeyLength, Protogen } from "../Protogen";
import { generateSecretKey, typeAssert } from "../utils/Utils";
import { AbstractApp } from "./AbstractApp";
import { AppJwtPayload } from "./AppJwtPayload";
import jwt from 'jsonwebtoken';
import { User } from "../database/models/auth/User.model";

export const AppRenderLockName = "App";

export class AppManager {
  private readonly _protogen;
  private readonly _apps: AbstractApp[] = [];
  private _activeApp: AbstractApp | null = null;
  private _appJwtKey: string | null = null;

  constructor(protogen: Protogen) {
    this._protogen = protogen;

    const keyFile = this.protogen.config.dataDirectory + "/app-jwt-secret.key";
    if (existsSync(keyFile)) {
      this.protogen.logger.info("AppManager", "Reading JWT key for app socket auth");
      this._appJwtKey = readFileSync(keyFile).toString();
    } else {
      this.protogen.logger.info("AppManager", "Could not find JWT key. Generating a random one");
      this._appJwtKey = generateSecretKey(JwtKeyLength);
      writeFileSync(keyFile, this._appJwtKey);
    }
  }

  public async validateJWTToken(token: string): Promise<AppJwtPayload | null> {
    if (this._appJwtKey == null) {
      throw new Error("JWT Key not defined");
    }

    let payload: AppJwtPayload;
    try {
      payload = typeAssert<AppJwtPayload>(jwt.verify(token, this._appJwtKey));
    } catch (_err) {
      console.log("JWT verify failed");
      return null;
    }

    const user = await this.protogen.userManager.getUserById(payload.issuerUserId);

    if (user == null) {
      console.log("Rejecting JWT due to issuer user being deleted");
      return null;
    }

    return payload;
  }

  public async generateJwtToken(user: User, app: AbstractApp): Promise<string> {
    const payload: AppJwtPayload = {
      issuerUserId: user.id,
      targetApplicationName: app.name,
      interactionKey: app.interactionKey,
    };

    if (this._appJwtKey == null) {
      throw new Error("JWT Key not defined");
    }

    const token = jwt.sign(payload, this._appJwtKey, {
      expiresIn: "1d",
    });

    return token;
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
    const app = this._apps.find((app) => app.name == name);
    return app || null;
  }

  public async registerApp(app: AbstractApp) {
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

  public async activateApp(name: string) {
    const app = this.getAppByName(name);
    if (!app) {
      throw new Error(`App ${name} not found`);
    }

    if (this.appRunning) {
      await this.deactivateApp();
    }

    try {
      this._activeApp = app;
      if (app.options.useRenderLock || app.options.useRenderer) {
        this.protogen.visor.appendRenderLock(AppRenderLockName);
      }
      await this._activeApp.onActivated();
      return true;
    } catch (err) {
      console.error(err);
      this.protogen.logger.error("AppManager", "Error activating app " + app.name);
      await this.deactivateApp();
    }
    return false;
  }

  public async deactivateApp() {
    this.protogen.visor.removeRenderLock(AppRenderLockName);

    if (this._activeApp) {
      try {
        await this._activeApp.onDeactivated();
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
