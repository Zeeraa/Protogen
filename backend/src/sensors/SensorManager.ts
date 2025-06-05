import { Subject } from "rxjs";
import { Protogen } from "../Protogen";
import { ProtogenEvents } from "../utils/ProtogenEvents";

const BoopDebounceTime = 3;

export class SensorManager {
  private protogen: Protogen;

  private boopSensorSubject: Subject<boolean>;
  private _boopSensorLastState = false; // What system thinks is active (debounced signal)
  private _boopSensorReportedState = false; // Last reported by sensor
  private _boopSensorDebounceTime = 0;

  constructor(protogen: Protogen) {
    this.protogen = protogen;
    this.boopSensorSubject = new Subject<boolean>();

    this.protogen.hardwareAbstractionLayer.rawBoopSensorObservable.subscribe(val => { this._boopSensorReportedState = val });

    setInterval(() => {
      if (this.protogen.interuptLoops) {
        return;
      }
      if (this._boopSensorDebounceTime > 0) {
        this._boopSensorDebounceTime--;
      } else if (this._boopSensorLastState != this._boopSensorReportedState) {
        this._boopSensorDebounceTime = BoopDebounceTime;
        this._boopSensorLastState = this._boopSensorReportedState;
        if (this._boopSensorReportedState == true) {
          this.protogen.logger.info("Sensors", "Boop sensor triggered");
        }
        //this.protogen.logger.info("Serial", "Boop state change to " + this._boopSensorReportedState);
        this.protogen.eventEmitter.emit(ProtogenEvents.Booped, this._boopSensorReportedState);
      }
    }, 100);
  }

  public get boopSensorObservable() {
    return this.boopSensorSubject.asObservable();
  }
}
