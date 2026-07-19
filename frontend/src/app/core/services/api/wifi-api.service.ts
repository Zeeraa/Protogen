import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WifiApiService extends ApiBaseService {
  getSavedNetworks(): Observable<WifiNetworkProfile[]> {
    return this.http.get<WifiNetworkProfile[]>(this.apiBaseUrl + "/wifi/networks");
  }

  addNetwork(credentials: WifiCredentials): Observable<AddWifiResponse> {
    return this.http.post<AddWifiResponse>(this.apiBaseUrl + "/wifi/networks", credentials);
  }

  editNetwork(uuid: string, credentials: WifiCredentials): Observable<any> {
    return this.http.put(this.apiBaseUrl + "/wifi/networks/" + uuid, credentials);
  }

  deleteNetwork(uuid: string): Observable<any> {
    return this.http.delete(this.apiBaseUrl + "/wifi/networks/" + uuid);
  }

  connectNetwork(uuid: string): Observable<any> {
    return this.http.post(this.apiBaseUrl + "/wifi/networks/" + uuid + "/connect", {});
  }

  disconnectNetwork(uuid: string): Observable<any> {
    return this.http.post(this.apiBaseUrl + "/wifi/networks/" + uuid + "/disconnect", {});
  }
}

export interface WifiNetworkProfile {
  uuid: string;
  name: string;
  ssid: string;
  security: "wpa-psk" | "open" | "unknown";
  autoconnect: boolean;
  autoconnectPriority: number;
  status: "disconnected" | "connecting" | "connected";
  connected: boolean;
  device: string | null;
}

export interface WifiCredentials {
  name: string;
  ssid: string;
  security: "wpa-psk" | "open";
  password?: string;
  autoconnect: boolean;
  autoconnectPriority: number;
}

export interface AddWifiResponse {
  message: string;
  uuid: string;
}
