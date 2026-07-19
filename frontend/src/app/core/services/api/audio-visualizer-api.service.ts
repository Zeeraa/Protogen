import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiBaseService } from '../api-base.service';

@Injectable({
  providedIn: 'root'
})
export class AudioVisualizerApiService extends ApiBaseService {
  getConfig(): Observable<AudioVisualizerConfigResponse> {
    return this.http.get<AudioVisualizerConfigResponse>(this.apiBaseUrl + '/audio-visualizer/config');
  }

  updateConfig(config: Partial<AudioVisualizerConfig>): Observable<AudioVisualizerConfigResponse> {
    return this.http.put<AudioVisualizerConfigResponse>(this.apiBaseUrl + '/audio-visualizer/config', config);
  }

  start(): Observable<{ message: string; isRunning: boolean }> {
    return this.http.post<{ message: string; isRunning: boolean }>(this.apiBaseUrl + '/audio-visualizer/start', {});
  }

  stop(): Observable<{ message: string; isRunning: boolean }> {
    return this.http.post<{ message: string; isRunning: boolean }>(this.apiBaseUrl + '/audio-visualizer/stop', {});
  }

  getData(): Observable<AudioVisualizerData> {
    return this.http.get<AudioVisualizerData>(this.apiBaseUrl + '/audio-visualizer/data');
  }

  listDevices(): Observable<{ devices: AudioDevice[] }> {
    return this.http.get<{ devices: AudioDevice[] }>(this.apiBaseUrl + '/audio-visualizer/devices');
  }
}

export interface AudioVisualizerConfigResponse {
  config: AudioVisualizerConfig;
  isRunning: boolean;
}

export interface AudioVisualizerConfig {
  enabled: boolean;
  deviceIndex: number | null;
  sensitivity: number;
}

export interface AudioVisualizerData {
  timestamp: number;
  intensity: number;
  bands: {
    sub_bass: number;
    bass: number;
    low_mids: number;
    mids: number;
    high_mids: number;
    highs: number;
    presence: number;
  };
  beat: boolean;
  style: 'bass_heavy' | 'vocal' | 'bright' | 'balanced' | 'quiet' | 'silence';
}

export interface AudioDevice {
  index: number;
  name: string;
  sampleRate?: number;
  channels?: number;
}
