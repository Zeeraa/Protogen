import { Protogen } from "../Protogen";

/**
 * This class is used to interact with the hardware allowing us to run this on different platforms.
 */
export abstract class HardwareAbstractionLayer {
  protected readonly protogen;

  constructor(protogen: Protogen) {
    this.protogen = protogen;
  }

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
   * Erite text lines to the HUD.
   * @param lines Array of lines to write to the HUD.
   */
  public abstract writeToHUD(lines: string[]): Promise<void>;

  /**
   * Write RGB LED values. The value is encoded as a single integer.
   * @param values Array of RGB values, each value is a 24-bit integer (0xRRGGBB).
   */
  public abstract writeLedData(values: number[]): Promise<void>;
}
