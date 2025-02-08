import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FaceApiService extends ApiBaseService {
  constructor(
    http: HttpClient,
    toastr: ToastrService,
  ) {
    super(http, toastr);
  }

  getData() {
    return this.http.get<FaceData>(this.apiBaseUrl + "/face/data").pipe(catchError(this.defaultErrorHandler));
  }
}

export interface FaceData {
  expressions: FaceExpression[];
  defaultExpression: string | null;
}

export interface FaceExpression {
  data: FaceExpressionData;
  preview: string;
}

export interface FaceExpressionData {
  uuid: string;
  name: string;
  image: string;
  mirrorImage: boolean;
  flipRightSide: boolean;
  flipLeftSide: boolean;
}
