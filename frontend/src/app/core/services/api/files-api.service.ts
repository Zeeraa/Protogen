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
}

export interface ImageUploadResponse {
  resource: string;
}

export interface UploadFileOptions {
  remoteGifProcessing?: boolean;
}
