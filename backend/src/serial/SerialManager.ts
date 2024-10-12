import { SerialPort } from "serialport";
import { Protogen } from "../Protogen";
import { ReadlineParser } from '@serialport/parser-readline';
import { cyan, green, magenta } from "colors";
import { encodeRGB } from "../utils/Utils";

export class SerialManager {
  private _protogen;
  private _port: SerialPort | null = null;

  counter = 0;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this.connect();
    setInterval(() => {
      if (this._port != null) {
        if (this._port.isOpen) {
          const colors = [encodeRGB(255, 0, 0), encodeRGB(255, 255, 0), encodeRGB(0, 255, 0), encodeRGB(0, 255, 255), encodeRGB(0, 255, 255), encodeRGB(255, 0, 255)];
          const toSend: string[] = [];
          let string = "RGB:";
          this.counter++;
          for (let i = 0; i < 48; i++) {
            toSend.push(String(colors[(i + this.counter) % colors.length]));
          }
          string += toSend.join(",");
          //console.log("Send color bytes.", green(string));
          this.write(string);
        }
      }
    }, 1000 / 20);

    setInterval(() => {
      this.syncTime();
    }, 1000 * 60);
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

      console.log(`Received serial message: ${cyan(string)}`);
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