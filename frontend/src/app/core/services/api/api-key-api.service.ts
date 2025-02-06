import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiKeyApi extends ApiBaseService {
  getAllKeys() {
    return this.http.get<ApiKey[]>(this.apiBaseUrl + "/api-keys").pipe(catchError(this.defaultErrorHandler));
  }

  createKey(data: CreateApiKeyOptions) {
    return this.http.post<ApiKey>(this.apiBaseUrl + "/api-keys", data).pipe(catchError(this.defaultErrorHandler));
  }

  deleteKey(key: string) {
    return this.http.delete(this.apiBaseUrl + "/api-keys/" + key).pipe(catchError(this.defaultErrorHandler));
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
