import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HudApiService extends ApiBaseService {
  setHudEnabled(enabled: boolean) {
    const payload = {
      enabled: enabled
    }

    return this.http.post(this.apiBaseUrl + "/hud/set-enabled", payload).pipe(catchError(this.defaultErrorHandler));
  }
}
