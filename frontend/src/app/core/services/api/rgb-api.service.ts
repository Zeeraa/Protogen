import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError, Observable } from 'rxjs';
import { typeAssert } from '../utils/Utils';

@Injectable({
  providedIn: 'root'
})
export class RgbApiService extends ApiBaseService {
  constructor(
    http: HttpClient,
    toastr: ToastrService,
  ) {
    super(http, toastr);
  }

  getEffects(): Observable<RgbEffectInfo[]> {
    return typeAssert<Observable<RgbEffectInfo[]>>(this.http.get(this.apiBaseUrl + "/rgb/effects").pipe(catchError(this.defaultErrorHandler)));
  }

  removeEffect(sceneId: string, effectId: string): Observable<any> {
    return typeAssert<Observable<any>>(this.http.delete(this.apiBaseUrl + "/rgb/scenes/" + sceneId + "/effect/" + effectId).pipe(catchError(this.defaultErrorHandler)));
  }

  addEffect(sceneId: string, effect: string, displayName: string): Observable<RgbEffectInfo[]> {
    return typeAssert<Observable<RgbEffectInfo[]>>(this.http.post(this.apiBaseUrl + "/rgb/scenes/" + sceneId + "/effect", {
      effect: effect,
      displayName: displayName,
    }).pipe(catchError(this.defaultErrorHandler)));
  }

  setEffectProperty(sceneId: string, effectId: string, propertyName: string, value: string, fullSave = false) {
    return typeAssert<Observable<RgbEffectInfo[]>>(this.http.put(this.apiBaseUrl + "/rgb/scenes/" + sceneId + "/effect/" + effectId + "/property/" + propertyName + "?fullSave=" + (fullSave ? "true" : "false"), {
      value: value,
    }).pipe(catchError(this.defaultErrorHandler)));
  }

  updateEffect(sceneId: string, effectId: string, data: { displayName: string; }) {
    return typeAssert<Observable<any>>(this.http.put(this.apiBaseUrl + "/rgb/scenes/" + sceneId + "/effect/" + effectId, data).pipe(catchError(this.defaultErrorHandler)));
  }

  activateScene(id: string): Observable<RgbScene> {
    return typeAssert<Observable<RgbScene>>(this.http.post(this.apiBaseUrl + "/rgb/scenes/" + id + "/activate", {}).pipe(catchError(this.defaultErrorHandler)));
  }

  deleteScene(id: string): Observable<any> {
    return typeAssert<Observable<any>>(this.http.delete(this.apiBaseUrl + "/rgb/scenes/" + id).pipe(catchError(this.defaultErrorHandler)));
  }

  deactivate(): Observable<any> {
    return typeAssert<Observable<any>>(this.http.delete(this.apiBaseUrl + "/rgb/scenes/active").pipe(catchError(this.defaultErrorHandler)));
  }

  saveSceneData(id: string, data: { name: string; }) {
    return typeAssert<Observable<any>>(this.http.put(this.apiBaseUrl + "/rgb/scenes/" + id, data).pipe(catchError(this.defaultErrorHandler)));
  }

  createNewScene(name: string): Observable<RgbScene> {
    return typeAssert<Observable<RgbScene>>(this.http.post(this.apiBaseUrl + "/rgb/scenes/new", {
      name: name,
    }).pipe(catchError(this.defaultErrorHandler)));
  }

  getScene(id: string): Observable<RgbScene> {
    return typeAssert<Observable<RgbScene>>(this.http.get(this.apiBaseUrl + "/rgb/scenes/" + id).pipe(catchError(this.defaultErrorHandler)));
  }

  getScenes(): Observable<RgbScene[]> {
    return typeAssert<Observable<RgbScene[]>>(this.http.get(this.apiBaseUrl + "/rgb/scenes").pipe(catchError(this.defaultErrorHandler)));
  }

  getRgbPreviewConfig(): Observable<RgbPreviewConfiguration> {
    return typeAssert<Observable<RgbPreviewConfiguration>>(this.http.get(this.apiBaseUrl + "/rgb/preview/config").pipe(catchError(this.defaultErrorHandler)));
  }

  setRgbPreviewConfig(config: RgbPreviewConfiguration): Observable<any> {
    return typeAssert<Observable<any>>(this.http.put(this.apiBaseUrl + "/rgb/preview/config", config).pipe(catchError(this.defaultErrorHandler)));
  }
}

export interface RgbEffectInfo {
  name: string;
  description: string;
}

export interface RgbScene {
  id: string;
  name: string;
  effects: RgbEffect[];
}

export interface RgbEffect {
  id: string;
  name: string;
  displayName: string;
  properties: RgbEffectProperty[];
}

export interface RgbEffectProperty {
  name: string;
  type: string;
  restrictions: PropertyKVData<any>;
  metadata: PropertyKVData<any>;
  value: any;
}

export type PropertyKVData<T> = {
  [key: string]: T;
}

export interface RgbPreviewConfiguration {
  canvas: RgbPreviewCanvas;
  largeViewportFullSize: boolean;
  elements: RgbPreviewElement[];
}

export interface RgbPreviewCanvas {
  width: number;
  height: number;
}

export interface RgbPreviewElement {
  id: string;
  name: string;
  type: RgbPreviewElementType;
  x: number;
  y: number;
  startIndex: number;
  length: number;
}

export enum RgbPreviewElementType {
  LedStrip = "LedStrip",
  LedRing = "LedRing",
}
