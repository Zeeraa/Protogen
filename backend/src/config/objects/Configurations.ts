import { SerialConfiguration } from "./SerialConfiguration";
import { DatabaseConfiguration } from "./DatabaseConfiguration";
import { FlaschenTaschenConfiguration } from "./FlaschenTaschenConfiguration";
import { LedMatrixConfiguration } from "./LedMatrixConfiguration";
import { RemoteWorkerConfiguration } from "./RemoteWorkerConfiguration";
import { WebConfiguration } from "./WebConfiguration";
import { RgbConfiguration } from "./RgbConfiguration";
import { MiscConfiguration } from "./MiscConfiguration";
import { HardwareType } from "../../hardware/HardwareType";
import { HUDConfiguration } from "./HUDConfiguration";
import { MqttConfiguration } from "./MqttConfiguration";

export interface Configuration {
  web: WebConfiguration;
  database: DatabaseConfiguration;
  flaschenTaschen: FlaschenTaschenConfiguration;
  ledMatrix: LedMatrixConfiguration;
  remoteWorker: RemoteWorkerConfiguration;
  serial: SerialConfiguration;
  rgb: RgbConfiguration;
  mqtt: MqttConfiguration;
  dataDirectory: string;
  logDirectory: string;
  misc: MiscConfiguration;
  hardware: HardwareType;
  hud: HUDConfiguration;
}
