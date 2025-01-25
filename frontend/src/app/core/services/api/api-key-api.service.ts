import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiKeyApi extends ApiBaseService {
  getAllKeys(): Observable<ApiKey[]> {
    return this.http.get(this.apiBaseUrl + "/api-keys").pipe(catchError(this.defaultErrorHandler)) as any as Observable<ApiKey[]>;
  }
}

export interface ApiKey {
  apiKey: string;
  name: string;
  superUser: boolean;
}
