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

  updateSettings(data: UpdateFaceSettingsDTO) {
    return this.http.put(this.apiBaseUrl + "/face/settings", data).pipe(catchError(this.defaultErrorHandler));
  }

  getExpressions() {
    return this.http.get<FaceExpression[]>(this.apiBaseUrl + "/face/expressions").pipe(catchError(this.defaultErrorHandler));
  }

  activateExpression(id: string) {
    return this.http.post(this.apiBaseUrl + "/face/expressions/" + id + "/activate", {}).pipe(catchError(this.defaultErrorHandler));
  }

  addExpression(data: AlterExpressionDTO) {
    return this.http.post<FaceExpression>(this.apiBaseUrl + "/face/expressions", data).pipe(catchError(this.defaultErrorHandler));
  }

  updateExpression(id: string, data: AlterExpressionDTO) {
    return this.http.post<FaceExpression>(this.apiBaseUrl + "/face/expressions/" + id, data).pipe(catchError(this.defaultErrorHandler));
  }

  deleteExpression(id: string) {
    return this.http.delete(this.apiBaseUrl + "/face/expressions/" + id).pipe(catchError(this.defaultErrorHandler));
  }
}

export interface UpdateFaceSettingsDTO {
  defaultExpressionId?: string | null;
}

export interface AlterExpressionDTO {
  name: string;
  image: string;
  mirrorImage: boolean;
  flipRightSide: boolean;
  flipLeftSide: boolean;
  replaceColors: boolean;
}

export interface FaceData {
  expressions: FaceExpression[];
  defaultExpression: string | null;
}

export interface FaceExpression {
  data: FaceExpressionData;
  preview: string;
}

export interface FaceExpressionData extends AlterExpressionDTO {
  uuid: string;
  name: string;
  image: string;
  mirrorImage: boolean;
  flipRightSide: boolean;
  flipLeftSide: boolean;
  replaceColors: boolean;
}
