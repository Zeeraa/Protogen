import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';

@Injectable({
  providedIn: 'root'
})
export class BackupApiService extends ApiBaseService {
  getDownloadToken() {
    return this.http.get<{ token: string }>(this.apiBaseUrl + '/backup/get-download-token');
  }
}
