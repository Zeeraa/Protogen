import * as dgram from 'dgram';
import sharp from 'sharp';
import { FlaschenTaschenConfiguration } from '../../config/objects/FlaschenTaschenConfiguration';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import yargsParser from 'yargs-parser';
import { execAsync } from '../../utils/SystemUtils';
import { Protogen } from '../../Protogen';

const DefaultFlaschenTaschenParameters = "--led-cols=64 --led-rows=32 --led-chain=2 --led-gpio-mapping=adafruit-hat";
const DefaultLedSlowdown = 3;
const DefaultRefreshRateLimit = 100;

export class FlaschenTaschen {
  private _socket;
  private _protogen;

  private _ledSlowdownGpio: number;
  private _ledLimitRefresh: number;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._socket = dgram.createSocket("udp4");

    if (!existsSync(this.config.configFile)) {
      this._ledSlowdownGpio = DefaultLedSlowdown;
      this._ledLimitRefresh = DefaultRefreshRateLimit;
      console.log("FT config file not found. Creating it...");
      this.writeConfiguration({});
    } else {
      const cfgString = readFileSync(this.config.configFile).toString();
      const parsed = yargsParser(cfgString, {
        configuration: {
          'short-option-groups': false,
          'camel-case-expansion': true,
        },
      });

      //console.log(parsed);
      this._ledSlowdownGpio = parseInt(String(parsed["led-slowdown-gpio"] || DefaultLedSlowdown));
      this._ledLimitRefresh = parseInt(String(parsed["led-limit-refresh"] || DefaultRefreshRateLimit));

      if (isNaN(this._ledSlowdownGpio)) {
        console.error("Invalid ledSlowdownGpio");
        this._ledSlowdownGpio = DefaultLedSlowdown;
      }

      if (isNaN(this._ledLimitRefresh)) {
        console.error("Invalid ledLimitRefresh");
        this._ledLimitRefresh = DefaultRefreshRateLimit;
      }
    }
  }

  private get config() {
    return this._protogen.config.flaschenTaschen;
  }

  private get protogen() {
    return this._protogen;
  }

  sendImageBuffer(imageBuffer: Buffer, width: number, height: number, xOffset = 0, yOffset = 0, zLayer = 0) {
    return new Promise<void>(async (resolve, reject) => {
      const ppmHeader = `P6\n${width} ${height}\n#FT: ${xOffset} ${yOffset} ${zLayer}\n255\n`;
      const ppmHeaderBuffer = Buffer.from(ppmHeader, 'ascii');

      const buffer = await sharp(imageBuffer)
        .raw()
        .removeAlpha()
        .toBuffer();

      const ppmBuffer = Buffer.concat([ppmHeaderBuffer, buffer]);

      this._socket.send(ppmBuffer, 0, ppmBuffer.length, this.config.port, this.config.host, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    })
  }

  public writeConfiguration(options: FlaschenTaschenWriteConfigParams) {
    if (options.ledSlowdownGpio != null) {
      this._ledSlowdownGpio = options.ledSlowdownGpio;
    }

    if (options.ledLimitRefresh != null) {
      this._ledLimitRefresh = options.ledLimitRefresh;
    }

    let params = this.config.customParams == null ? DefaultFlaschenTaschenParameters : this.config.customParams;
    params += " --led-slowdown-gpio=" + this._ledSlowdownGpio;
    params += " --led-limit-refresh=" + this._ledLimitRefresh;

    this.protogen.logger.info("FlaschenTaschen", "Updating config file");

    writeFileSync(this.config.configFile, params);
  }

  public async restart() {
    this.protogen.logger.info("FlaschenTaschen", "Restarting service");
    await execAsync("sudo service flaschen-taschen restart");
  }

  get settings(): FlaschenTaschenActiveSettings {
    return {
      ledLimitRefresh: this._ledLimitRefresh,
      ledSlowdownGpio: this._ledSlowdownGpio,
    }
  }
}

export interface FlaschenTaschenWriteConfigParams {
  ledSlowdownGpio?: number;
  ledLimitRefresh?: number;
}

export interface FlaschenTaschenActiveSettings {
  ledSlowdownGpio: number;
  ledLimitRefresh: number;
} 