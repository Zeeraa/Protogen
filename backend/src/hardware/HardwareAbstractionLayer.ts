import { Observable } from "rxjs";
import { Protogen } from "../Protogen";
import { HardwareType } from "./HardwareType";

/**
 * This class is used to interact with the hardware allowing us to run this on different platforms.
 */
export abstract class HardwareAbstractionLayer {
  public abstract restartFlaschenTaschen(): Promise<void>;

  protected readonly protogen;

  constructor(protogen: Protogen) {
    this.protogen = protogen;
  }

  /**
   * Get the implementation enum value of the hardware.
   */
  public abstract get hardwareType(): HardwareType;

  /**
   * This method is called when the HAL is initialized.
   * It can be used to set up the hardware
   */
  public async init() { }

  /**
   * Shtutdown the hardware.
   */
  public abstract shutdown(): Promise<void>;

  /**
   * Get the CPU temperature in degrees Celsius.
   */
  public abstract getCPUTemperature(): Promise<number>;

  /**
   * Get the CPU usage as a percentage.
   */
  public abstract getCPUUsage(): Promise<number>;

  /**
   * Get the RAM usage
   */
  public abstract getRAMUsage(): Promise<number>;

  /**
   * Get the name and version of the OS
   */
  public abstract getOSVersion(): Promise<string>;

  /**
   * Set the volume level.
   */
  public abstract setVolume(level: number): Promise<void>;

  /**
   * Get the current volume level.
   */
  public abstract getVolume(): Promise<number>;

  /**
   * Get available audio output devices.
   */
  public abstract getAudioDevices(): Promise<AudioDevice[]>;

  /**
   * Set the active audio output device by its id.
   */
  public abstract setAudioDevice(deviceId: number): Promise<void>;

  /**
   * Erite text lines to the HUD.
   * @param lines Array of lines to write to the HUD.
   */
  public abstract writeToHUD(lines: string[]): Promise<void>;

  /**
   * Write RGB LED values. The value is encoded as a single integer.
   * @param values Array of RGB values, each value is a 24-bit integer (0xRRGGBB).
   */
  public abstract writeLedData(values: number[]): Promise<void>;

  public abstract get rawBoopSensorObservable(): Observable<boolean>;
}

export interface AudioDevice {
  id: number;
  name: string;
  isDefault: boolean;
}
