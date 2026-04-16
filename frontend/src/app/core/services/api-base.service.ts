import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiBaseService {
  protected readonly http = inject(HttpClient);

  get apiBaseUrl() {
    return environment.apiUrl;
  }
}
