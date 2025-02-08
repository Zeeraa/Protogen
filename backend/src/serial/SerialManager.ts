import { SerialPort } from "serialport";
import { Protogen } from "../Protogen";
import { ReadlineParser } from '@serialport/parser-readline';
import { cyan, magenta } from "colors";
import { compareStringArrays } from "../utils/Utils";
import { ProtogenEvents } from "../utils/ProtogenEvents";
import { KV_EnableHUD } from "../utils/KVDataStorageKeys";

const DebounceTime = 3;

export class SerialManager {
  private _protogen;
  private _port: SerialPort | null = null;
  private _lastDisplayContent: string[] = [];
  private _enableHud = true;
  private _boopSensorLastState = false; // What system thinks is active (debounced signal)
  private _boopSensorReportedState = false; // Last reported by sensor
  private _boopSensorDebounceTime = 0;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this.connect();

    setInterval(() => {
      this.updateDisplay();
    }, 1000 * 1);

    setInterval(() => {
      if (this._boopSensorDebounceTime > 0) {
        this._boopSensorDebounceTime--;
      } else if (this._boopSensorLastState != this._boopSensorReportedState) {
        this._boopSensorDebounceTime = DebounceTime;
        this._boopSensorReportedState = this._boopSensorLastState;
        if (this._boopSensorReportedState == true) {
          this.protogen.logger.info("Serial", "Boop sensor triggered");
        }
        //this.protogen.logger.info("Serial", "Boop state change to " + this._boopSensorReportedState);
        this.protogen.eventEmitter.emit(ProtogenEvents.Booped, this._boopSensorReportedState);
      }
    }, 100);
  }

  protected get config() {
    return this._protogen.config.serial;
  }

  protected get protogen(): Protogen {
    return this._protogen;
  }

  public async init() {
    await this.protogen.database.initMissingData(KV_EnableHUD, "true");
    this.enableHud = await this.protogen.database.getData(KV_EnableHUD) == "true";
  }

  public async setPersistentHUDState(state: boolean) {
    this.enableHud = state;
    const stateStr = String(state);
    this.protogen.logger.info("Serial", "Saving persistent hud state as " + cyan(stateStr));
    await this.protogen.database.setData(KV_EnableHUD, stateStr);
  }

  public get enableHud() {
    return this._enableHud;
  }

  public set enableHud(enabled: boolean) {
    this.protogen.logger.info("Serial", (enabled ? "Enabling" : "Disabling") + " HUD display");
    this._enableHud = enabled;
    if (!enabled) {
      for (let i = 0; i < this._lastDisplayContent.length; i++) {
        this._lastDisplayContent[i] = "";
      }
      this.write("TEXT:" + this._lastDisplayContent.join("|"));
    }
  }

  public write(data: string) {
    if (this._port != null) {
      if (this._port.isOpen) {
        this._port.write(data + "\n", (err) => {
          if (err) {
            return console.error(err);
          }
        });
        return true;
      }
    }
    return false;
  }

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

    if (!this.protogen.networkManager.hasConnectivity) {
      additionalInfo.push("Connectivity issues!");
    }

    if (this.protogen.videoPlaybackManager.monitoredJob != null) {
      additionalInfo.push("Video DL: " + this.protogen.videoPlaybackManager.status);
    }

    const lineArray = [visorStatus, rgbStatus];
    while (lineArray.length < this.config.oledTextLines) {
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

    this.write("TEXT:" + lineArray.join("|"));
  }

  get isReady() {
    if (this._port != null) {
      if (this._port.isOpen) {
        return true;
      }
    }
    return false;
  }

  private connect() {
    if (this._port != null) {
      if (this._port.isOpen) {
        this.protogen.logger.info("Serial", "Closing existing existing connection");
        this._port.close();
      }
    }

    this.protogen.logger.info("Serial", "Starting connection on port " + magenta(this.config.port) + " with baud rate " + cyan(String(this.config.baudRate)));
    this._port = new SerialPort({
      path: this.config.port,
      baudRate: this.config.baudRate,
    });

    const parser = this._port.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', (data) => {
      const string = String(data);
      if (string.startsWith("OK:RGB")) {
        return;
      }

      if (string.startsWith("OK:TEXT")) {
        return;
      }

      if (string.startsWith("BOOP:")) {
        console.debug("Raw boop state value: " + string.split(":")[1].toLowerCase().trim());
        const state = string.split(":")[1].toLowerCase().trim() == "true";
        this._boopSensorReportedState = state;
        return;
      }

      this.protogen.logger.info("Serial", `Received serial message: ${cyan(string)}`);
    });

    this._port.on('open', () => {
      this.protogen.logger.info("Serial", 'Serial Port Opened');
    });

    this._port.on('error', (err) => {
      this.protogen.logger.error("Serial", "Error in serial connection: " + err.message);
    });

    this._port.on('close', () => {
      this.protogen.logger.warn("Serial", "Serial connection closed");
    });
  }
}

function cleanText(input: string) {
  return input.replace(/[^a-zA-Z0-9 .,!\-_]/g, '');
}
