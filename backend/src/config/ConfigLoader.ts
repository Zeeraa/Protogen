import { HardwareType } from "../hardware/HardwareType";
import { Configuration } from "./objects/Configurations";
import { DatabaseConfiguration } from "./objects/DatabaseConfiguration";
import { FlaschenTaschenConfiguration } from "./objects/FlaschenTaschenConfiguration";
import { HUDConfiguration } from "./objects/HUDConfiguration";
import { LedMatrixConfiguration } from "./objects/LedMatrixConfiguration";
import { MiscConfiguration } from "./objects/MiscConfiguration";
import { RemoteWorkerConfiguration } from "./objects/RemoteWorkerConfiguration";
import { RgbConfiguration } from "./objects/RgbConfiguration";
import { SerialConfiguration } from "./objects/SerialConfiguration";
import { WebConfiguration } from "./objects/WebConfiguration";

/**
 * Reads configuration from environment variables and returns a Configuration object.
 * @returns The loaded configuration.
 */
export function loadConfiguration(): Configuration {
  //#region Hardware
  const hardware = process.env["HARDWARE"] as HardwareType;
  if (hardware == null || hardware.trim().length == 0) {
    throw new Error("Missing or invalid: HARDWARE");
  }

  if (!Object.values(HardwareType).includes(hardware)) {
    throw new Error("Unknown hardware type: " + hardware + ". Valid values: " + Object.values(HardwareType).join(", "));
  }
  //#endregion

  //#region Web
  const webPort = parseInt(String(process.env["PORT"]));
  let webLocalHttpsPort: number | null = null;

  if (isNaN(webPort) || webPort <= 0 || webPort > 65535) {
    throw new Error("Missing or invalid: PORT");
  }

  if (process.env["LOCAL_HTTPS_PORT"] != null) {
    webLocalHttpsPort = parseInt(String(process.env["LOCAL_HTTPS_PORT"]));

    if (isNaN(webLocalHttpsPort) || webLocalHttpsPort <= 0 || webLocalHttpsPort > 65535) {
      throw new Error("Invalid: LOCAL_HTTPS_PORT");
    }

    if (webLocalHttpsPort == webPort) {
      throw new Error("LOCAL_HTTPS_PORT cannot be the same as PORT");
    }
  }

  const web: WebConfiguration = {
    port: webPort,
    localHttpsPort: webLocalHttpsPort
  }
  //#endregion

  //#region Database
  const dbHost = process.env["DB_HOST"];
  const dbPort = parseInt(String(process.env["DB_PORT"]));
  const dbUsername = process.env["DB_USERNAME"];
  const dbPassword = process.env["DB_PASSWORD"];
  const dbDatabase = process.env["DB_DATABASE"];
  const dbLogging = String(process.env["DB_LOGGING"]).toLowerCase() == "true";
  if (isNaN(dbPort) || dbPort <= 0 || dbPort > 65535) {
    throw new Error("Missing or invalid: DB_PORT");
  }

  if (dbHost == null) {
    throw new Error("Missing: DB_HOST");
  }

  if (dbUsername == null) {
    throw new Error("Missing: DB_USERNAME");
  }

  if (dbPassword == null) {
    throw new Error("Missing: DB_PASSWORD");
  }

  if (dbDatabase == null) {
    throw new Error("Missing: DB_DATABASE");
  }

  const database: DatabaseConfiguration = {
    host: dbHost,
    port: dbPort,
    username: dbUsername,
    password: dbPassword,
    database: dbDatabase,
    logging: dbLogging,
  }
  //#endregion

  //#region Flaschen taschen
  const ftHost = process.env["FT_HOST"];
  const ftConfig = process.env["FT_CONFIG_FILE"];
  const ftCustomArgs = process.env["FT_CUSTOM_PARAMS"];

  const ftPort = parseInt(String(process.env["FT_PORT"]));

  if (isNaN(ftPort) || ftPort <= 0 || ftPort > 65535) {
    throw new Error("Missing or invalid: FT_PORT");
  }

  if (ftConfig == null) {
    throw new Error("Missing: FT_CONFIG_FILE");
  }

  if (ftHost == null) {
    throw new Error("Missing: FT_HOST");
  }

  const flaschenTaschen: FlaschenTaschenConfiguration = {
    host: ftHost,
    port: ftPort,
    configFile: ftConfig,
    customParams: ftCustomArgs || null,
  }
  //#endregion

  //#region LED Matrix
  const ledWidth = parseInt(String(process.env["LED_WIDTH"]));
  const ledHeight = parseInt(String(process.env["LED_HEIGHT"]));

  if (isNaN(ledWidth) || ledWidth <= 0) {
    throw new Error("Missing or invalid: LED_WIDTH");
  }

  if (isNaN(ledHeight) || ledHeight <= 0) {
    throw new Error("Missing or invalid: LED_HEIGHT");
  }

  const ledMatrix: LedMatrixConfiguration = {
    width: ledWidth,
    height: ledHeight,
  }
  //#endregion

  //#region Remote Worker
  const remoteWorkerUrl = process.env["REMOTE_WORKER_URL"];
  let workerKey = "";
  if (process.env["REMOTE_WORKER_KEY"] != null) {
    workerKey = process.env["REMOTE_WORKER_KEY"];
  }

  if (remoteWorkerUrl == null) {
    throw new Error("Missing: REMOTE_WORKER_URL");
  }


  const remoteWorker: RemoteWorkerConfiguration = {
    url: removeTrailingSlash(remoteWorkerUrl),
    key: workerKey,
  }
  //#endregion

  //#region Serial
  const serialPort = process.env["SERIAL_PORT"];
  const serialBaudRate = parseInt(String(process.env["SERIAL_BAUD_RATE"]));

  if (isNaN(serialBaudRate) || serialBaudRate <= 0) {
    throw new Error("Missing or invalid: SERIAL_BAUD_RATE");
  }

  if (serialPort == null) {
    throw new Error("Missing: SERIAL_PORT");
  }

  const serialConfig: SerialConfiguration = {
    port: serialPort,
    baudRate: serialBaudRate,
  }
  //#endregion

  //#region HUD
  const oledTextLines = parseInt(String(process.env["OLED_TEXT_LINES"]));

  if (isNaN(oledTextLines) || oledTextLines <= 0) {
    throw new Error("Missing or invalid: OLED_TEXT_LINES");
  }

  const hudConfig: HUDConfiguration = {
    lines: oledTextLines,
  }
  //#endregion

  //#region RGB
  const ledCount = parseInt(String(process.env["RGB_LED_COUNT"]));
  const ledRefreshRate = parseInt(String(process.env["RGB_REFRESH_RATE"]));
  if (isNaN(ledCount) || ledCount < 0) {
    throw new Error("Missing or invalid: RGB_LED_COUNT");
  }

  if (isNaN(ledRefreshRate) || ledCount < 0) {
    throw new Error("Missing or invalid: RGB_REFRESH_RATE");
  }

  const rgb: RgbConfiguration = {
    ledCount: ledCount,
    refreshRate: ledRefreshRate,
  }
  //#endregion

  //#region Misc
  const visorPreviewInterval = parseInt(String(process.env["VISOR_PREVIEW_INTERVAL"]));
  if (isNaN(visorPreviewInterval) || visorPreviewInterval < 1) {
    throw new Error("Missing or invalid: VISOR_PREVIEW_INTERVAL");
  }

  const misc: MiscConfiguration = {
    visorPreviewInterval: visorPreviewInterval
  }
  //#endregion

  const dataDirectory = process.env["DATA_DIRECTORY"] || "./data";
  const logDirectory = process.env["LOG_DIRECTORY"] || "./logs";

  return {
    web: web,
    database: database,
    flaschenTaschen: flaschenTaschen,
    ledMatrix: ledMatrix,
    remoteWorker: remoteWorker,
    serial: serialConfig,
    rgb: rgb,
    dataDirectory: dataDirectory,
    logDirectory: logDirectory,
    misc: misc,
    hardware: hardware,
    hud: hudConfig,
  }
}

function removeTrailingSlash(url: string): string {
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  }
  return url;
}
