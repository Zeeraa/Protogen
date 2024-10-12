import { Configuration } from "./objects/Configurations";
import { DatabaseConfiguration } from "./objects/DatabaseConfiguration";
import { FlaschenTaschenConfiguration } from "./objects/FlaschenTaschenConfiguration";
import { LedMatrixConfiguration } from "./objects/LedMatrixConfiguration";
import { RemoteWorkerConfiguration } from "./objects/RemoteWorkerConfiguration";
import { SerialConfiguration } from "./objects/SerialConfiguration";
import { WebConfiguration } from "./objects/WebConfiguration";

export function loadConfiguration(): Configuration {
  //#region Web
  const webPort = parseInt(String(process.env["PORT"]));

  if (isNaN(webPort) || webPort <= 0 || webPort > 65535) {
    throw new Error("Missing or invalid: PORT");
  }

  const web: WebConfiguration = {
    port: webPort,
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
  const ftHost = process.env["FT_HOST"]

  const ftPort = parseInt(String(process.env["FT_PORT"]));

  if (isNaN(ftPort) || ftPort <= 0 || ftPort > 65535) {
    throw new Error("Missing or invalid: FT_PORT");
  }

  if (ftHost == null) {
    throw new Error("Missing: FT_HOST");
  }

  const flaschenTaschen: FlaschenTaschenConfiguration = {
    host: ftHost,
    port: ftPort,
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

  if (remoteWorkerUrl == null) {
    throw new Error("Missing: REMOTE_WORKER_URL");
  }


  const remoteWorker: RemoteWorkerConfiguration = {
    url: removeTrailingSlash(remoteWorkerUrl),
  }
  //#endregion

  //#region Arduino
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

  const tempDirectory = process.env["TEMP_DIRECTORY"] || "./temp";

  return {
    web: web,
    database: database,
    flaschenTaschen: flaschenTaschen,
    ledMatrix: ledMatrix,
    remoteWorker: remoteWorker,
    serial: serialConfig,
    tempDirectory: tempDirectory,
  }
}

function removeTrailingSlash(url: string): string {
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  }
  return url;
}