import { cyan } from "colors";
import { Protogen } from "../Protogen";
import { appendFileSync } from "fs";
import { SocketMessageType } from "../webserver/socket/SocketMessageType";

export class Logger {
  private _protogen;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  private get protogen() {
    return this._protogen;
  }

  public info(system: string | null, message: string) {
    let msg = "";
    if (system != null) {
      msg = "[" + cyan(system) + "] ";
    }
    msg += message;

    console.log(msg);
    this.handleMessage("log", msg);
  }

  public warn(system: string | null, message: string) {
    let msg = "";
    if (system != null) {
      msg = "[" + cyan(system) + "] ";
    }
    msg += message;

    console.warn(msg);
    this.handleMessage("warning", msg);
  }

  public error(system: string | null, message: string) {
    let msg = "";
    if (system != null) {
      msg = "[" + cyan(system) + "] ";
    }
    msg += message;

    console.error(msg);
    this.handleMessage("error", msg);
  }

  public get sessionLogFile() {
    return this.protogen.config.logDirectory + "/session.log";
  }

  private handleMessage(type: string, data: string) {
    const path = this.sessionLogFile;
    appendFileSync(path, type + "," + data + "\n");

    // WebServer might not be initialized yet at this point so we have to check if its null
    if (this.protogen.webServer != null) {
      this.protogen.webServer.broadcastMessage(SocketMessageType.S2C_LogMessage, { type: "log", content: data });
    }
  }
}