import { Observable, Subject } from "rxjs";
import { HardwareAbstractionLayer } from "../HardwareAbstractionLayer";
import { HardwareType } from "../HardwareType";
import { Protogen } from "../../Protogen";
import { getVolume, setVolume } from "loudness";
import { getPlatform } from "../../utils/Utils";
import { cyan } from "colors";
import { SocketMessageType } from "../../webserver/socket/SocketMessageType";

export class EmulatedHardwareImplementation extends HardwareAbstractionLayer {
  private _emulatedBoopSensorState: boolean = false;
  private _boopSensorSubject: Subject<boolean> = new Subject<boolean>();
  private _ledData: number[] = [];
  private _hudLines: string[] = [];
  private _emulatedVolume: number = 50;
  private readonly platform: string;

  constructor(protogen: Protogen) {
    super(protogen);
    this.platform = getPlatform();
    this.protogen.logger.warn("EmulatedHardware", "Using emulated hardware implementation. Platform: " + cyan(this.platform));
  }

  public get hardwareType() {
    return HardwareType.EMULATED;
  }

  public async init() {
    this.protogen.logger.info("EmulatedHardware", "EmulatedHardwareImplementation::init() called");
    try {
      this._emulatedVolume = await getVolume();
    } catch (err) {
      this.protogen.logger.error("EmulatedHardware", "Failed to get initial volume");
      console.error("Error getting initial volume:", err);
    }
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
    return "Emulated hardware on platform: " + this.platform;
  }

  public async setVolume(level: number) {
    this.protogen.logger.info("EmulatedHardware", `Setting volume to ${level}`);
    this._emulatedVolume = level;
    try {
      await setVolume(level);
    } catch (error) {
      console.error("Failed to set volume:", error);
    }
    this.sendStateChange({ volume: level });
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
    this.sendStateChange({ ledData: values });
  }

  public async writeToHUD(lines: string[]) {
    this._hudLines = lines;
    this.sendStateChange({ hudLines: lines });
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
    this.sendStateChange({ boopSensorState: state });
  }

  public toggleBoopSensorState() {
    this.emulatedBoopSensorState = !this.emulatedBoopSensorState;
  }

  public getEmulatedState() {
    return {
      boopSensorState: this._emulatedBoopSensorState,
      ledData: this._ledData,
      hudLines: this._hudLines,
      volume: this._emulatedVolume,
    };
  }

  public async restartFlaschenTaschen() {
    this.sendStateChange({ messages: ["Requested restart of flaschen-taschen service"] });
  }

  private sendStateChange(state: EmulatedHardwareChange) {
    this.protogen.webServer.socketSessions.filter(session => session.enableDevData).forEach(session => {
      session.sendMessage(SocketMessageType.S2C_DevHardwareEmulationState, state);
    });
  }
}

export interface EmulatedHardwareState {
  boopSensorState: boolean;
  ledData: number[];
  hudLines: string[];
  volume: number;
}

export interface EmulatedHardwareChange {
  boopSensorState?: boolean;
  ledData?: number[];
  hudLines?: string[];
  volume?: number;
  messages?: string[];
}
