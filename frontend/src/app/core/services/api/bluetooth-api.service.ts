import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError, Observable, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class BluetoothApiService extends ApiBaseService {

  getPairedDevices(): Observable<BluetoothDevice[]> {
    return this.http.get<BluetoothDevice[]>(this.apiBaseUrl + "/bluetooth/devices/paired").pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to get paired devices");
        return throwError(() => err);
      })
    );
  }

  getDiscoveredDevices(): Observable<BluetoothDevice[]> {
    return this.http.get<BluetoothDevice[]>(this.apiBaseUrl + "/bluetooth/devices").pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to get discovered devices");
        return throwError(() => err);
      })
    );
  }

  getDeviceInfo(mac: string): Observable<BluetoothDevice> {
    return this.http.get<BluetoothDevice>(this.apiBaseUrl + "/bluetooth/devices/" + mac).pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to get device info");
        return throwError(() => err);
      })
    );
  }

  startScan(duration: number = 10): Observable<ScanResponse> {
    return this.http.post<ScanResponse>(this.apiBaseUrl + "/bluetooth/scan", { duration }).pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to start scan");
        return throwError(() => err);
      })
    );
  }

  stopScan(): Observable<any> {
    return this.http.delete(this.apiBaseUrl + "/bluetooth/scan").pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to stop scan");
        return throwError(() => err);
      })
    );
  }

  getScanStatus(): Observable<ScanStatus> {
    return this.http.get<ScanStatus>(this.apiBaseUrl + "/bluetooth/scan").pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to get scan status");
        return throwError(() => err);
      })
    );
  }

  pairDevice(mac: string): Observable<any> {
    return this.http.post(this.apiBaseUrl + "/bluetooth/devices/" + mac + "/pair", {}).pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to pair device");
        return throwError(() => err);
      })
    );
  }

  unpairDevice(mac: string): Observable<any> {
    return this.http.delete(this.apiBaseUrl + "/bluetooth/devices/" + mac + "/pair").pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to unpair device");
        return throwError(() => err);
      })
    );
  }

  connectDevice(mac: string): Observable<any> {
    return this.http.post(this.apiBaseUrl + "/bluetooth/devices/" + mac + "/connect", {}).pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to connect to device");
        return throwError(() => err);
      })
    );
  }

  disconnectDevice(mac: string): Observable<any> {
    return this.http.delete(this.apiBaseUrl + "/bluetooth/devices/" + mac + "/connect").pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to disconnect from device");
        return throwError(() => err);
      })
    );
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
