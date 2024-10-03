import { DatabaseConfiguration } from "./DatabaseConfiguration";
import { FlaschenTaschenConfiguration } from "./FlaschenTaschenConfiguration";
import { LedMatrixConfiguration } from "./LedMatrixConfiguration";
import { RemoteWorkerConfiguration } from "./RemoteWorkerConfiguration";
import { WebConfiguration } from "./WebConfiguration";

export interface Configuration {
  web: WebConfiguration,
  database: DatabaseConfiguration,
  flaschenTaschen: FlaschenTaschenConfiguration,
  ledMatrix: LedMatrixConfiguration,
  remoteWorker: RemoteWorkerConfiguration,
  tempDirectory: string;
}