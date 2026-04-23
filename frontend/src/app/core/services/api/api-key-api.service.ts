import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';

@Injectable({
  providedIn: 'root'
})
export class ApiKeyApi extends ApiBaseService {
  getAllKeys() {
    return this.http.get<ApiKey[]>(this.apiBaseUrl + "/api-keys");
  }

  createKey(data: CreateApiKeyOptions) {
    return this.http.post<ApiKey>(this.apiBaseUrl + "/api-keys", data);
  }

  deleteKey(key: string) {
    return this.http.delete(this.apiBaseUrl + "/api-keys/" + key);
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
