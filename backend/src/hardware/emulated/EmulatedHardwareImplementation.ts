import { Observable, Subject } from "rxjs";
import { HardwareAbstractionLayer } from "../HardwareAbstractionLayer";
import { HardwareType } from "../HardwareType";
import { Protogen } from "../../Protogen";
import { getVolume, setVolume } from "loudness";

export class EmulatedHardwareImplementation extends HardwareAbstractionLayer {
  private _emulatedBoopSensorState: boolean = false;
  private _boopSensorSubject: Subject<boolean> = new Subject<boolean>();
  private _ledData: number[] = [];
  private _hudLines: string[] = [];
  private _emulatedVolume: number = 50;

  constructor(protogen: Protogen) {
    super(protogen);
    this.protogen.logger.warn("EmulatedHardware", "Using emulated hardware implementation");
  }

  public get hardwareType() {
    return HardwareType.EMULATED;
  }

  public async init() {
    this.protogen.logger.info("EmulatedHardware", "EmulatedHardwareImplementation::init() called");
  }

  public async shutdown(): Promise<void> {
    this.protogen.logger.info("EmulatedHardware", "Shutting down");
    process.exit(0);
  }

  public async getCPUTemperature(): Promise<number> {
    return 42; //TODO: try to get real value or use placeholder
  }

  public async getCPUUsage(): Promise<number> {
    return 50; //TODO: try to get real value or use placeholder
  }

  public async getRAMUsage(): Promise<number> {
    return 2048; //TODO: try to get real value or use placeholder
  }

  public async getOSVersion(): Promise<string> {
    return "Emulated OS v1.0"; // Placeholder value for emulated hardware
  }

  public async setVolume(level: number) {
    this.protogen.logger.info("EmulatedHardware", `Setting volume to ${level}`);
    try {
      await setVolume(level);
    } catch (error) {
      console.error("Failed to set volume:", error);
      this._emulatedVolume = level;
    }
  }

  public async getVolume(): Promise<number> {
    try {
      return getVolume();
    } catch (error) {
      console.error("Failed to get volume:", error);
      return this._emulatedVolume;
    }
  }

  public async writeLedData(values: number[]) {
    this._ledData = values;
  }

  public async writeToHUD(lines: string[]) {
    this._hudLines = lines;
  }

  public get rawBoopSensorObservable(): Observable<boolean> {
    return this._boopSensorSubject.asObservable();
  }

  public get emulatedBoopSensorState(): boolean {
    return this._emulatedBoopSensorState;
  }

  public set emulatedBoopSensorState(state: boolean) {
    this._emulatedBoopSensorState = state;
    this._boopSensorSubject.next(state);
  }

  public getEmulatedState() {
    return {
      boopSensorState: this._emulatedBoopSensorState,
      ledData: this._ledData,
      hudLines: this._hudLines,
    };
  }
}
