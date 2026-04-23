import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FaceApiService extends ApiBaseService {
  private faceColorEffectTypeCache: FaceColorEffectType[] | null = null;

  getData() {
    return this.http.get<FaceData>(this.apiBaseUrl + "/face/data");
  }

  updateSettings(data: UpdateFaceSettingsDTO) {
    return this.http.put(this.apiBaseUrl + "/face/settings", data);
  }

  getExpressions() {
    return this.http.get<FaceExpression[]>(this.apiBaseUrl + "/face/expressions");
  }

  activateExpression(id: string, activateFaceRenderer = false) {
    return this.http.post(this.apiBaseUrl + "/face/expressions/" + id + "/activate?activateRenderer=" + (activateFaceRenderer ? "true" : "false"), {});
  }

  addExpression(data: AlterExpressionDTO) {
    return this.http.post<FaceExpression>(this.apiBaseUrl + "/face/expressions", data);
  }

  updateExpression(id: string, data: AlterExpressionDTO) {
    return this.http.put<FaceExpression>(this.apiBaseUrl + "/face/expressions/" + id, data);
  }

  activateColorEffect(id: string | null) {
    return this.http.put<{ active: FaceColorEffect | null }>(this.apiBaseUrl + "/face/color-effects/active", {
      id: id,
    });
  }

  deleteExpression(id: string) {
    return this.http.delete(this.apiBaseUrl + "/face/expressions/" + id);
  }

  getFaceColorEffectTypes(useCache = true) {
    if (useCache && this.faceColorEffectTypeCache != null) {
      return of(this.faceColorEffectTypeCache);
    }
    return this.http.get<FaceColorEffectType[]>(this.apiBaseUrl + "/face/color-effects/types").pipe(
      tap(types => {
        this.faceColorEffectTypeCache = types;
      })
    );
  }

  getFaceColorEffects() {
    return this.http.get<FaceColorEffect[]>(this.apiBaseUrl + "/face/color-effects");
  }

  setEffectProperty(effectId: string, propertyName: string, value: string, fullSave = false) {
    return this.http.put<FaceColorEffect>(this.apiBaseUrl + "/face/color-effects/" + effectId + "/property/" + propertyName + "?fullSave=" + (fullSave ? "true" : "false"), {
      value: value,
    });
  }

  updateEffect(effectId: string, data: UpdateFaceColorEffect) {
    return this.http.put<FaceColorEffect>(this.apiBaseUrl + "/face/color-effects/" + effectId, data);
  }

  newFaceColorEffect(name: string, effect: string) {
    return this.http.post<FaceColorEffect>(this.apiBaseUrl + "/face/color-effects/new", { name, effect });
  }

  removeColorEffect(id: string) {
    return this.http.delete<any>(this.apiBaseUrl + "/face/color-effects/" + id);
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
  description: string | null;
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
  linkedColorEffectId: string | null;
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
  linkedColorEffect: LinkedColorEffect | null;
  linkedColorEffectId: never;
}

interface LinkedColorEffect {
  uuid: string;
  name: string;
}

export function colorEffectToLinkedColorEffect(effect: FaceColorEffect | undefined | null): LinkedColorEffect | null {
  if (effect != null) {
    return {
      uuid: effect.id,
      name: effect.name,
    };
  }
  return null;
}
