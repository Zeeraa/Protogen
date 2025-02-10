import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FaceApiService extends ApiBaseService {
  private faceColorEffectTypeCache: FaceColorEffectType[] | null = null;

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

  activateColorEffect(id: string | null) {
    return this.http.put<{ active: FaceColorEffect | null }>(this.apiBaseUrl + "/face/color-effects/active", {
      id: id,
    }).pipe(catchError(this.defaultErrorHandler));
  }

  deleteExpression(id: string) {
    return this.http.delete(this.apiBaseUrl + "/face/expressions/" + id).pipe(catchError(this.defaultErrorHandler));
  }

  getFaceColorEffectTypes(useCache = true) {
    if (useCache && this.faceColorEffectTypeCache != null) {
      return of(this.faceColorEffectTypeCache);
    }
    return this.http.get<FaceColorEffectType[]>(this.apiBaseUrl + "/face/color-effects/types").pipe(
      catchError(this.defaultErrorHandler),
      tap(types => {
        this.faceColorEffectTypeCache = types;
      })
    );
  }

  getFaceColorEffects() {
    return this.http.get<FaceColorEffect[]>(this.apiBaseUrl + "/face/color-effects").pipe(catchError(this.defaultErrorHandler));
  }

  setEffectProperty(effectId: string, propertyName: string, value: string, fullSave = false) {
    return this.http.put<FaceColorEffect>(this.apiBaseUrl + "/face/color-effects/" + effectId + "/property/" + propertyName + "?fullSave=" + (fullSave ? "true" : "false"), {
      value: value,
    }).pipe(catchError(this.defaultErrorHandler));
  }

  updateEffect(effectId: string, data: UpdateFaceColorEffect) {
    return this.http.put<FaceColorEffect>(this.apiBaseUrl + "/face/color-effects/" + effectId, data).pipe(catchError(this.defaultErrorHandler));
  }

  newFaceColorEffect(name: string, effect: string) {
    return this.http.post<FaceColorEffect>(this.apiBaseUrl + "/face/color-effects/new", { name, effect }).pipe(catchError(this.defaultErrorHandler));
  }

  removeColorEffect(id: string) {
    return this.http.delete<any>(this.apiBaseUrl + "/face/color-effects/" + id).pipe(catchError(this.defaultErrorHandler));
  }
}

export interface FaceColorEffect {
  id: string;
  type: string;
  name: string;
  properties: FaceColorEffectProperty[];
}

export interface FaceColorEffectProperty {
  name: string;
  type: string;
  restrictions: any;
  metadata: any;
  value: any;
}

export interface UpdateFaceColorEffect {
  name: string;
}


export interface FaceColorEffectType {
  name: string;
  description: string;
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
