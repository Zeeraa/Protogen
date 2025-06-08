import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class DevApi extends ApiBaseService {
  constructor(
    http: HttpClient,
    toastr: ToastrService,
  ) {
    super(http, toastr);
  }

  getEmulatedHardwareStatus() {
    return this.http.get<HardwareEmulationStatus>(this.apiBaseUrl + "/dev/hw-emulation");
  }

  toggleEmulatedBoopSensor() {
    return this.http.post<ToggleEmulatedBoopSensorStatus>(this.apiBaseUrl + "/dev/hw-emulation/toggle-boop-sensor-state", {});
  }
}

export interface HardwareEmulationStatus {
  hwEmulationEnabled: boolean;
  state: HardwareEmulationState | null;
}

export interface HardwareEmulationState {
  boopSensorState: boolean;
  ledData: number[];
  hudLines: string[];
  volume: number;
}

export interface ToggleEmulatedBoopSensorStatus {
  success: boolean;
  state?: boolean;
}
