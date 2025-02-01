import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError, Observable } from 'rxjs';
import { typeAssert } from '../utils/Utils';

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
    return typeAssert<Observable<VolumeResponse>>(this.http.get(this.apiBaseUrl + "/audio/volume").pipe(catchError(this.defaultErrorHandler)));
  }
}

interface VolumeResponse {
  volume: number;
}
