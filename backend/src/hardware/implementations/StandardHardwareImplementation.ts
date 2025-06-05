import * as os from 'os';
import { exec } from "child_process";
import { HardwareAbstractionLayer } from "../HardwareAbstractionLayer";
import { promisify } from "util";
import { Protogen } from '../../Protogen';
import { ReadlineParser, SerialPort } from 'serialport';
import { cyan, magenta } from 'colors';
import { Observable, Subject } from 'rxjs';
import { Hardware } from '../Hardware';

export const execAsync = promisify(exec);

export class StandardHardwareImplementation extends HardwareAbstractionLayer {
  private serialPort: string;
  private serialBaudRate: number;
  private serial: SerialPort | null = null;
  private boopSensorSubject = new Subject<boolean>();

  constructor(protogen: Protogen, serialPort: string, serialBaudRate: number) {
    super(protogen);
    this.serialPort = serialPort;
    this.serialBaudRate = serialBaudRate;
  }

  public get hardwareType(): Hardware {
    return Hardware.STANDARD;
  }

  public connectSerial() {
    if (this.serial != null) {
      if (this.serial.isOpen) {
        this.protogen.logger.info("StandardHardwareImplementation", "Closing existing existing serial connection");
        this.serial.close();
      }
    }

    this.protogen.logger.info("StandardHardwareImplementation", "Starting connection on port " + magenta(this.serialPort) + " with baud rate " + cyan(String(this.serialBaudRate)));
    this.serial = new SerialPort({
      path: this.serialPort,
      baudRate: this.serialBaudRate,
    });

    const parser = this.serial.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', (data) => {
      const string = String(data);
      if (string.startsWith("OK:RGB")) {
        return;
      }

      if (string.startsWith("OK:TEXT")) {
        return;
      }

      if (string.startsWith("BOOP:")) {
        //console.debug("Raw boop state value: " + string.split(":")[1].toLowerCase().trim());
        const state = string.split(":")[1].toLowerCase().trim() == "true";
        this.boopSensorSubject.next(state);
        return;
      }

      this.protogen.logger.info("StandardHardwareImplementation", `Received serial message: ${cyan(string)}`);
    });

    this.serial.on('open', () => {
      this.protogen.logger.info("StandardHardwareImplementation", 'Serial Port Opened');
    });

    this.serial.on('error', (err) => {
      this.protogen.logger.error("StandardHardwareImplementation", "Error in serial connection: " + err.message);
    });

    this.serial.on('close', () => {
      this.protogen.logger.warn("StandardHardwareImplementation", "Serial connection closed");
    });
  }

  public serialWrite(data: string) {
    if (this.serial != null) {
      if (this.serial.isOpen) {
        this.serial.write(data + "\n", (err) => {
          if (err) {
            return console.error(err);
          }
        });
        return true;
      }
    }
    return false;
  }

  public async init() {
    this.connectSerial();
  }

  public async shutdown(): Promise<void> {
    await execAsync("sudo systemctl poweroff");
  }

  public async getCPUTemperature(): Promise<number> {
    try {
      const { stdout } = await execAsync('vcgencmd measure_temp');
      const temp = parseFloat(stdout.replace('temp=', '').replace("'C\n", ''));
      return temp;
    } catch (error) {
      console.error('Error getting temperature:', error);
      return -1;
    }
  }

  public async getCPUUsage(): Promise<number> {
    const cpus = os.cpus();
    const startUsage = cpus.map(cpu => cpu.times);

    // Wait for a short period to get a better snapshot
    await new Promise(resolve => setTimeout(resolve, 100));

    const endUsage = os.cpus().map(cpu => cpu.times);

    const totalStart = startUsage.reduce((total, cpu) => {
      total.user += cpu.user;
      total.nice += cpu.nice;
      total.sys += cpu.sys;
      total.idle += cpu.idle;
      total.irq += cpu.irq;
      return total;
    }, { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 });

    const totalEnd = endUsage.reduce((total, cpu) => {
      total.user += cpu.user;
      total.nice += cpu.nice;
      total.sys += cpu.sys;
      total.idle += cpu.idle;
      total.irq += cpu.irq;
      return total;
    }, { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 });

    const totalTime = (totalEnd.user + totalEnd.nice + totalEnd.sys + totalEnd.idle + totalEnd.irq) -
      (totalStart.user + totalStart.nice + totalStart.sys + totalStart.idle + totalStart.irq);

    const idleTime = totalEnd.idle - totalStart.idle;

    const usage = ((totalTime - idleTime) / totalTime) * 100;
    return parseFloat(usage.toFixed(2));
  }

  public async getRAMUsage(): Promise<number> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usage = (usedMem / totalMem) * 100;
    return parseFloat(usage.toFixed(2));
  }

  public async getOSVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync('cat /etc/os-release');
      const releaseMatch = stdout.match(/PRETTY_NAME="([^"]+)"/);
      return releaseMatch ? releaseMatch[1] : 'Unknown';
    } catch (error) {
      console.error('Error getting OS version:', error);
      return 'Unknown';
    }
  }

  public setVolume(level: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (level < 0 || level > 100) {
        return reject(new Error('Volume level must be between 0 and 100'));
      }

      const command = `amixer set Master ${level}%`;

      exec(command, (error, _stdout, stderr) => {
        if (error) {
          return reject(`Error setting volume: ${stderr}`);
        }
        resolve();
      });
    });
  }

  public getVolume(): Promise<number> {
    return new Promise((resolve, reject) => {
      const command = `amixer get Master`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          return reject(`Error getting volume: ${stderr}`);
        }

        // Extract the volume percentage from stdout
        const matches = stdout.match(/(\d+)%/);

        if (matches && matches[1]) {
          const volume = parseInt(matches[1], 10);
          resolve(volume);
        } else {
          reject(new Error('Could not parse volume level'));
        }
      });
    });
  }

  public async writeToHUD(lines: string[]): Promise<void> {
    this.serialWrite("TEXT:" + lines.join("|"));
  }

  public async writeLedData(values: number[]): Promise<void> {
    if (values.length == 0) {
      return;
    }
    const data = "RGB:" + values.join(",");
    this.serialWrite(data);
  }

  public get rawBoopSensorObservable(): Observable<boolean> {
    return this.boopSensorSubject.asObservable();
  }
}
