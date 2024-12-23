import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError, Observable } from 'rxjs';

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

  uploadImage(file: File, options: UploadFileOptions = {}): Observable<ImageUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post(this.apiBaseUrl + "/images" + (options.remoteGifProcessing == true ? "?externalGifProcessing=true" : ""), formData) as Observable<ImageUploadResponse>;
  }
}

export interface ImageUploadResponse {
  resource: string;
}

export interface UploadFileOptions {
  remoteGifProcessing?: boolean;
}
