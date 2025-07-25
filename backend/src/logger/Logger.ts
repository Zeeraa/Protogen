import { cyan } from "colors";
import { Protogen } from "../Protogen";
import { appendFileSync } from "fs";
import { SocketMessageType } from "../webserver/socket/SocketMessageType";

/**
 * Logger that prints to the node console and the web console
 */
export class Logger {
  private _protogen;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  private get protogen() {
    return this._protogen;
  }

  /**
   * Print message with info log level.
   * @param system The name of the subsystem or null if its a generic message.
   * @param message The message to send.
   */
  public info(system: string | null, message: string) {
    let msg = "";
    if (system != null) {
      msg = "[" + cyan(system) + "] ";
    }
    msg += message;

    console.log(msg);
    this.handleMessage("log", msg);
  }

  /**
     * Print message with warning log level.
     * @param system The name of the subsystem or null if its a generic message.
     * @param message The message to send.
     */
  public warn(system: string | null, message: string) {
    let msg = "";
    if (system != null) {
      msg = "[" + cyan(system) + "] ";
    }
    msg += message;

    console.warn(msg);
    this.handleMessage("warning", msg);
  }

  /**
   * Print message with info error level.
   * @param system The name of the subsystem or null if its a generic message.
   * @param message The message to send.
   */
  public error(system: string | null, message: string) {
    let msg = "";
    if (system != null) {
      msg = "[" + cyan(system) + "] ";
    }
    msg += message;

    console.error(msg);
    this.handleMessage("error", msg);
  }

  /**
   * Get the path to the session log file.
   * @returns Log file path.
   */
  public get sessionLogFile() {
    return this.protogen.config.logDirectory + "/session.log";
  }

  /**
   * Internal function that handles logging to file and console.
   * @param type The log type
   * @param data The log message
   */
  private handleMessage(type: LogType, data: string) {
    const path = this.sessionLogFile;
    appendFileSync(path, type + "," + data + "\n");

    // WebServer might not be initialized yet at this point so we have to check if its null
    if (this.protogen.webServer != null) {
      this.protogen.webServer.broadcastMessage(SocketMessageType.S2C_LogMessage, { type: "log", content: data });
    }
  }
}

type LogType = "log" | "warning" | "error";
