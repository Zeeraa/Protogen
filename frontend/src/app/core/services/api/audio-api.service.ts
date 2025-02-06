import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AudioApiService extends ApiBaseService {
  constructor(
    http: HttpClient,
    toastr: ToastrService,
  ) {
    super(http, toastr);
  }

  setVolume(volume: number) {
    const payload = {
      volume: volume
    }

    return this.http.post(this.apiBaseUrl + "/audio/volume", payload).pipe(catchError(this.defaultErrorHandler));
  }

  getVolume() {
    return this.http.get<VolumeResponse>(this.apiBaseUrl + "/audio/volume").pipe(catchError(this.defaultErrorHandler));
  }
}

interface VolumeResponse {
  volume: number;
}
