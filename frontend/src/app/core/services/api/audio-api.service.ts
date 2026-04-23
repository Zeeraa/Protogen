import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';

@Injectable({
  providedIn: 'root'
})
export class AudioApiService extends ApiBaseService {
  setVolume(volume: number) {
    const payload = {
      volume: volume
    }

    return this.http.post(this.apiBaseUrl + "/audio/volume", payload);
  }

  getVolume() {
    return this.http.get<VolumeResponse>(this.apiBaseUrl + "/audio/volume");
  }
}

interface VolumeResponse {
  volume: number;
}
