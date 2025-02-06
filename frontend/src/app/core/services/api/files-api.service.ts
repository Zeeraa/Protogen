import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class FilesApiService extends ApiBaseService {
  constructor(
    http: HttpClient,
    toastr: ToastrService,
  ) {
    super(http, toastr);
  }

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
