import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

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

  getEffects() {
    return this.http.get<RgbEffectInfo[]>(this.apiBaseUrl + "/rgb/effects").pipe(catchError(this.defaultErrorHandler));
  }

  removeEffect(sceneId: string, effectId: string) {
    return this.http.delete(this.apiBaseUrl + "/rgb/scenes/" + sceneId + "/effect/" + effectId).pipe(catchError(this.defaultErrorHandler));
  }

  addEffect(sceneId: string, effect: string, displayName: string) {
    return this.http.post<RgbEffectInfo[]>(this.apiBaseUrl + "/rgb/scenes/" + sceneId + "/effect", {
      effect: effect,
      displayName: displayName,
    }).pipe(catchError(this.defaultErrorHandler));
  }

  setEffectProperty(sceneId: string, effectId: string, propertyName: string, value: string, fullSave = false) {
    return this.http.put<RgbEffectInfo[]>(this.apiBaseUrl + "/rgb/scenes/" + sceneId + "/effect/" + effectId + "/property/" + propertyName + "?fullSave=" + (fullSave ? "true" : "false"), {
      value: value,
    }).pipe(catchError(this.defaultErrorHandler));
  }

  updateEffect(sceneId: string, effectId: string, data: { displayName: string; }) {
    return this.http.put(this.apiBaseUrl + "/rgb/scenes/" + sceneId + "/effect/" + effectId, data).pipe(catchError(this.defaultErrorHandler));
  }

  activateScene(id: string) {
    return this.http.post<RgbScene>(this.apiBaseUrl + "/rgb/scenes/" + id + "/activate", {}).pipe(catchError(this.defaultErrorHandler));
  }

  deleteScene(id: string) {
    return this.http.delete(this.apiBaseUrl + "/rgb/scenes/" + id).pipe(catchError(this.defaultErrorHandler));
  }

  deactivate() {
    return this.http.delete(this.apiBaseUrl + "/rgb/scenes/active").pipe(catchError(this.defaultErrorHandler));
  }

  saveSceneData(id: string, data: { name: string; }) {
    return this.http.put(this.apiBaseUrl + "/rgb/scenes/" + id, data).pipe(catchError(this.defaultErrorHandler));
  }

  createNewScene(name: string) {
    return this.http.post<RgbScene>(this.apiBaseUrl + "/rgb/scenes/new", {
      name: name,
    }).pipe(catchError(this.defaultErrorHandler));
  }

  getScene(id: string) {
    return this.http.get<RgbScene>(this.apiBaseUrl + "/rgb/scenes/" + id).pipe(catchError(this.defaultErrorHandler));
  }

  getScenes() {
    return this.http.get<RgbScene[]>(this.apiBaseUrl + "/rgb/scenes").pipe(catchError(this.defaultErrorHandler));
  }

  getRgbPreviewConfig() {
    return this.http.get<RgbPreviewConfiguration>(this.apiBaseUrl + "/rgb/preview/config").pipe(catchError(this.defaultErrorHandler));
  }

  setRgbPreviewConfig(config: RgbPreviewConfiguration) {
    return this.http.put(this.apiBaseUrl + "/rgb/preview/config", config).pipe(catchError(this.defaultErrorHandler));
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
