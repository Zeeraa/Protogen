import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError, Observable } from 'rxjs';

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

  setVolume(volume: number): Observable<any> {
    const payload = {
      volume: volume
    }

    return this.http.post(this.apiBaseUrl + "/audio/volume", payload).pipe(catchError(this.defaultErrorHandler));
  }

  getVolume(): Observable<VolumeResponse> {
    return this.http.get(this.apiBaseUrl + "/audio/volume").pipe(catchError(this.defaultErrorHandler)) as any as Observable<VolumeResponse>;
  }
}

interface VolumeResponse {
  volume: number;
}
