import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AudioVisualizerApiService extends ApiBaseService {
  getSettings() {
    return this.http.get<AudioVisualizerSetting>(this.apiBaseUrl + "/audio-visualizer/settings").pipe(catchError(this.defaultErrorHandler));
  }

  updateSettings(settings: AudioVisualizerSetting) {
    return this.http.put<AudioVisualizerSetting>(this.apiBaseUrl + "/audio-visualizer/settings", settings).pipe(catchError(this.defaultErrorHandler));
  }
}

export interface AudioVisualizerSetting {
  lowThreshold: number;
  highThreshold: number;
  rawAmplification: number;
}
