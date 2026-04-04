import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpRequest } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class BackupApiService extends ApiBaseService {
  getDownloadToken() {
    return this.http.get<{ token: string }>(this.apiBaseUrl + '/backup/get-download-token');
  }

  importBackup(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const req = new HttpRequest('POST', this.apiBaseUrl + '/backup/import', formData, {
      reportProgress: true,
    });
    return this.http.request<{ id: string }>(req);
  }
}
