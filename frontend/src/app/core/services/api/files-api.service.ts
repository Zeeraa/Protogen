import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';

@Injectable({
  providedIn: 'root'
})
export class FilesApiService extends ApiBaseService {
  uploadImage(file: File, options: UploadFileOptions = {}) {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<ImageUploadResponse>(this.apiBaseUrl + "/images" + (options.remoteGifProcessing == true ? "?externalGifProcessing=true" : ""), formData);
  }

  uploadIcon(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<{ message: string }>(this.apiBaseUrl + "/images/icon", formData);
  }

  clearIcon() {
    return this.http.delete<{ message: string }>(this.apiBaseUrl + "/images/icon");
  }
}

export interface ImageUploadResponse {
  resource: string;
}

export interface UploadFileOptions {
  remoteGifProcessing?: boolean;
}
