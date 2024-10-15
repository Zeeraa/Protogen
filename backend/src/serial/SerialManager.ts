import { SerialPort } from "serialport";
import { Protogen } from "../Protogen";
import { ReadlineParser } from '@serialport/parser-readline';
import { cyan, magenta } from "colors";

export class SerialManager {
  private _protogen;
  private _port: SerialPort | null = null;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this.connect();

    setInterval(() => {
      this.syncTime();
    }, 1000 * 60);

    setInterval(() => {
      this.updateDisplay();
    }, 1000 * 1);
  }

  protected get config() {
    return this._protogen.config.serial;
  }

  protected get protogen(): Protogen {
    return this._protogen;
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
    let visorStatus = "Visor: " + cleanText(this.protogen.visor.activeRenderer?.name || "None");
    if (this.protogen.videoPlaybackManager.isPlaying) {
      visorStatus = "Visor: Video playing";
    }

    const rgbStatus = "RGB: " + cleanText(this.protogen.rgb.activeScene?.name || "None");

    const additionalInfo: string[] = [];

    if (!this.protogen.netowrkManager.hasConnectivity) {
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

    this.write("TEXT:" + lineArray.join("|"));
  }

  public syncTime() {
    const unixTime = Math.floor(Date.now() / 1000);
    if (this.write("TIME:" + unixTime + "\n")) {
      this.protogen.logger.info("Serial", "Sending time sync");
    }
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

      this.protogen.logger.info("Serial", `Received serial message: ${cyan(string)}`);
    });

    this._port.on('open', () => {
      this.protogen.logger.info("Serial", 'Serial Port Opened');
      setTimeout(() => {
        this.syncTime();
      }, 1000);
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