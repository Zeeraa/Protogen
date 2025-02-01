import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError, Observable } from 'rxjs';
import { typeAssert } from '../utils/Utils';

@Injectable({
  providedIn: 'root'
})
export class ApiKeyApi extends ApiBaseService {
  getAllKeys(): Observable<ApiKey[]> {
    return typeAssert<Observable<ApiKey[]>>(this.http.get(this.apiBaseUrl + "/api-keys").pipe(catchError(this.defaultErrorHandler)));
  }

  createKey(data: CreateApiKeyOptions): Observable<ApiKey> {
    return typeAssert<Observable<ApiKey>>(this.http.post(this.apiBaseUrl + "/api-keys", data).pipe(catchError(this.defaultErrorHandler)));
  }

  deleteKey(key: string) {
    return typeAssert<Observable<ApiKey>>(this.http.delete(this.apiBaseUrl + "/api-keys/" + key).pipe(catchError(this.defaultErrorHandler)));
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
