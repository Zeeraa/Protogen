import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

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
    return this.http.request<{ autoRestart: boolean }>(req);
  }

  // Chunked upload methods
  uploadChunk(uploadId: string | null, chunkIndex: number, chunk: Blob, fileName?: string, totalChunks?: number, fileSize?: number) {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());

    // First chunk creates the session
    if (chunkIndex === 0 && fileName && totalChunks && fileSize) {
      formData.append('fileName', fileName);
      formData.append('totalChunks', totalChunks.toString());
      formData.append('fileSize', fileSize.toString());
    }

    if (uploadId) {
      formData.append('uploadId', uploadId);
    }

    const req = new HttpRequest('POST', this.apiBaseUrl + '/backup/upload-chunk', formData, {
      reportProgress: true,
    });
    return this.http.request<{ success: boolean; uploadId: string; receivedChunks: number; totalChunks: number }>(req);
  }

  completeChunkUpload(uploadId: string) {
    return this.http.post<{ autoRestart: boolean }>(this.apiBaseUrl + '/backup/complete-chunk-upload', {
      uploadId
    });
  }
}
