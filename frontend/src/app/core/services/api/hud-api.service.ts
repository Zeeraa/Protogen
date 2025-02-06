import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HudApiService extends ApiBaseService {
  constructor(
    http: HttpClient,
    toastr: ToastrService,
  ) {
    super(http, toastr);
  }

  setHudEnabled(enabled: boolean) {
    const payload = {
      enabled: enabled
    }

    return this.http.post(this.apiBaseUrl + "/hud/set-enabled", payload).pipe(catchError(this.defaultErrorHandler));
  }
}
