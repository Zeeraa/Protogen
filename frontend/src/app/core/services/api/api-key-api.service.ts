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

  createKey(data: CreateApiKeyOptions): Observable<ApiKey> {
    return this.http.post(this.apiBaseUrl + "/api-keys", data).pipe(catchError(this.defaultErrorHandler)) as any as Observable<ApiKey>;
  }

  deleteKey(key: string) {
    return this.http.delete(this.apiBaseUrl + "/api-keys/" + key).pipe(catchError(this.defaultErrorHandler)) as any as Observable<ApiKey>;
  }
}

export interface CreateApiKeyOptions {
  name: string;
  superUser: boolean;
}

export interface ApiKey {
  apiKey: string;
  name: string;
  superUser: boolean;
}
