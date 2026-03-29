import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BluetoothApiService extends ApiBaseService {
  getPairedDevices(): Observable<BluetoothDevice[]> {
    return this.http.get<BluetoothDevice[]>(this.apiBaseUrl + "/bluetooth/devices/paired");
  }

  getDiscoveredDevices(): Observable<BluetoothDevice[]> {
    return this.http.get<BluetoothDevice[]>(this.apiBaseUrl + "/bluetooth/devices");
  }

  getDeviceInfo(mac: string): Observable<BluetoothDevice> {
    return this.http.get<BluetoothDevice>(this.apiBaseUrl + "/bluetooth/devices/" + mac);
  }

  startScan(duration = 10): Observable<ScanResponse> {
    return this.http.post<ScanResponse>(this.apiBaseUrl + "/bluetooth/scan", { duration });
  }

  stopScan(): Observable<any> {
    return this.http.delete(this.apiBaseUrl + "/bluetooth/scan");
  }

  getScanStatus(): Observable<ScanStatus> {
    return this.http.get<ScanStatus>(this.apiBaseUrl + "/bluetooth/scan");
  }

  pairDevice(mac: string): Observable<any> {
    return this.http.post(this.apiBaseUrl + "/bluetooth/devices/" + mac + "/pair", {});
  }

  unpairDevice(mac: string): Observable<any> {
    return this.http.delete(this.apiBaseUrl + "/bluetooth/devices/" + mac + "/pair");
  }

  connectDevice(mac: string): Observable<any> {
    return this.http.post(this.apiBaseUrl + "/bluetooth/devices/" + mac + "/connect", {});
  }

  disconnectDevice(mac: string): Observable<any> {
    return this.http.delete(this.apiBaseUrl + "/bluetooth/devices/" + mac + "/connect");
  }

  getRfkillStatus(): Observable<RfkillStatus> {
    return this.http.get<RfkillStatus>(this.apiBaseUrl + "/bluetooth/rfkill");
  }

  unblockRfkill(): Observable<any> {
    return this.http.post(this.apiBaseUrl + "/bluetooth/rfkill/unblock", {});
  }
}

export interface BluetoothDevice {
  macAddress: string;
  name: string;
  paired: boolean;
  connected: boolean;
  trusted: boolean;
}

export interface ScanResponse {
  message: string;
  duration: number;
}

export interface ScanStatus {
  scanning: boolean;
}

export interface RfkillStatus {
  softBlocked: boolean;
  hardBlocked: boolean;
}
