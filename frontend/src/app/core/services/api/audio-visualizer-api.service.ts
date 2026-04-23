import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';

@Injectable({
  providedIn: 'root'
})
export class AudioVisualizerApiService extends ApiBaseService {
  getSettings() {
    return this.http.get<AudioVisualizerSetting>(this.apiBaseUrl + "/audio-visualizer/settings");
  }

  updateSettings(settings: AudioVisualizerSetting) {
    return this.http.put<AudioVisualizerSetting>(this.apiBaseUrl + "/audio-visualizer/settings", settings);
  }
}

export interface AudioVisualizerSetting {
  lowThreshold: number;
  highThreshold: number;
  rawAmplification: number;
}
