import { cyan } from "colors";
import { Protogen } from "../Protogen";
import { KV_EnableHUD } from "../utils/KVDataStorageKeys";
import { compareStringArrays } from "../utils/Utils";

/**
 * Manages the HUD (Heads-Up Display) for displaying system information.
 * It updates the display periodically and allows enabling/disabling the HUD.
 */
export class HUDManager {
  private readonly protogen;
  private _enableHud = true;
  private _lastDisplayContent: string[] = [];

  constructor(protogen: Protogen) {
    this.protogen = protogen;

    setInterval(() => {
      if (this.protogen.interuptLoops) {
        return;
      }
      this.updateDisplay();
    }, 1000 * 0.5);
  }

  get config() {
    return this.protogen.config.hud;
  }

  /**
   * Check if the HUD is enabled.
   * @returns True if the HUD is enabled, false otherwise.
   */
  public get enableHud() {
    return this._enableHud;
  }

  /**
   * Enable or disable the HUD.
   * When disabled, the HUD will not display any information.
   */
  public set enableHud(enabled: boolean) {
    this.protogen.logger.info("HUD", (enabled ? "Enabling" : "Disabling") + " HUD display");
    this._enableHud = enabled;
    if (!enabled) {
      for (let i = 0; i < this._lastDisplayContent.length; i++) {
        this._lastDisplayContent[i] = "";
      }
      this.writeToHUD(this._lastDisplayContent);
    }
  }

  /**
   * Initializes the HUD manager and fetch from database.
   */
  public async init() {
    await this.protogen.database.initMissingData(KV_EnableHUD, "true");
    this.enableHud = await this.protogen.database.getData(KV_EnableHUD) == "true";
  }

  /**
   * Sets the persistent HUD state in the database.
   * @param state The state to set (true for enabled, false for disabled).
   */
  public async setPersistentHUDState(state: boolean) {
    this.enableHud = state;
    const stateStr = String(state);
    this.protogen.logger.info("HUD", "Saving persistent hud state as " + cyan(stateStr));
    await this.protogen.database.setData(KV_EnableHUD, stateStr);
  }

  /**
   * Updates the HUD display with the current system status.
   */
  public updateDisplay() {
    if (!this.enableHud) {
      return;
    }

    let visorStatus = "Visor: " + cleanText(this.protogen.visor.activeRenderer?.name || "None");
    if (this.protogen.videoPlaybackManager.isPlaying) {
      visorStatus = "Visor: Video playing";
    }

    const rgbStatus = "RGB: " + cleanText(this.protogen.rgb.activeScene?.name || "None");

    const additionalInfo: string[] = [];

    if (this.protogen.visor.activeRenderer?.id == this.protogen.visor.faceRenderer.id) {
      additionalInfo.push("Face: " + cleanText(this.protogen.visor.faceRenderer.activeExpression?.data.name || "None"));
    }

    if (!this.protogen.networkManager.hasConnectivity) {
      additionalInfo.push("Connectivity issues!");
    }

    if (this.protogen.videoPlaybackManager.monitoredJob != null) {
      additionalInfo.push("Video DL: " + this.protogen.videoPlaybackManager.status);
    }

    if (this.protogen.boopSensorManager.enabled && this.protogen.boopSensorManager.showOnHud) {
      additionalInfo.push("Boops: " + this.protogen.boopSensorManager.boopCounter);
    }

    const lineArray = [visorStatus, rgbStatus];
    while (lineArray.length < this.config.lines) {
      if (additionalInfo.length > 0) {
        lineArray.push(String(additionalInfo.shift()));
      } else {
        lineArray.push("");
      }
    }

    if (compareStringArrays(lineArray, this._lastDisplayContent)) {
      return;
    }
    this._lastDisplayContent = lineArray;

    this.writeToHUD(lineArray);
  }

  /**
   * Write text to the display
   * @param lines Array of lines to write
   */
  public writeToHUD(lines: string[]) {
    this.protogen.hardwareAbstractionLayer.writeToHUD(lines);
  }
}

/**
 * Cleans the text so that it can be displayed on the HUD
 * @param input The text to clean
 * @returns Clean version that we can send
 */
function cleanText(input: string) {
  return input.replace(/[^a-zA-Z0-9 .,!\-_]/g, '');
}
