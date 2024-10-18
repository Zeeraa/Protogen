import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError, Observable } from 'rxjs';

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
    return this.http.get(this.apiBaseUrl + "/rgb/effects").pipe(catchError(this.defaultErrorHandler)) as any as Observable<RgbEffectInfo[]>;
  }

  removeEffect(sceneId: string, effectId: string): Observable<any> {
    return this.http.delete(this.apiBaseUrl + "/rgb/scenes/" + sceneId + "/effect/" + effectId).pipe(catchError(this.defaultErrorHandler)) as any as Observable<any>;
  }

  addEffect(sceneId: string, effect: string, displayName: string): Observable<RgbEffectInfo[]> {
    return this.http.post(this.apiBaseUrl + "/rgb/scenes/" + sceneId + "/effect", {
      effect: effect,
      displayName: displayName,
    }).pipe(catchError(this.defaultErrorHandler)) as any as Observable<RgbEffectInfo[]>;
  }

  setEffectProperty(sceneId: string, effectId: string, propertyName: string, value: string, fullSave = false) {
    return this.http.put(this.apiBaseUrl + "/rgb/scenes/" + sceneId + "/effect/" + effectId + "/property/" + propertyName + "?fullSave=" + (fullSave ? "true" : "false"), {
      value: value,
    }).pipe(catchError(this.defaultErrorHandler)) as any as Observable<RgbEffectInfo[]>;
  }

  updateEffect(sceneId: string, effectId: string, data: { displayName: string; }) {
    return this.http.put(this.apiBaseUrl + "/rgb/scenes/" + sceneId + "/effect/" + effectId, data).pipe(catchError(this.defaultErrorHandler)) as any as Observable<any>;
  }

  activateScene(id: string): Observable<RgbScene> {
    return this.http.post(this.apiBaseUrl + "/rgb/scenes/" + id + "/activate", {}).pipe(catchError(this.defaultErrorHandler)) as any as Observable<RgbScene>;
  }

  deleteScene(id: string): Observable<any> {
    return this.http.delete(this.apiBaseUrl + "/rgb/scenes/" + id).pipe(catchError(this.defaultErrorHandler)) as any as Observable<any>;
  }

  deactivate(): Observable<any> {
    return this.http.delete(this.apiBaseUrl + "/rgb/scenes/active").pipe(catchError(this.defaultErrorHandler)) as any as Observable<any>;
  }

  saveSceneData(id: string, data: { name: string; }) {
    return this.http.put(this.apiBaseUrl + "/rgb/scenes/" + id, data).pipe(catchError(this.defaultErrorHandler)) as any as Observable<any>;
  }

  createNewScene(name: string): Observable<RgbScene> {
    return this.http.post(this.apiBaseUrl + "/rgb/scenes/new", {
      name: name,
    }).pipe(catchError(this.defaultErrorHandler)) as any as Observable<RgbScene>;
  }

  getScene(id: string): Observable<RgbScene> {
    return this.http.get(this.apiBaseUrl + "/rgb/scenes/" + id).pipe(catchError(this.defaultErrorHandler)) as any as Observable<RgbScene>;
  }

  getScenes(): Observable<RgbScene[]> {
    return this.http.get(this.apiBaseUrl + "/rgb/scenes").pipe(catchError(this.defaultErrorHandler)) as any as Observable<RgbScene[]>;
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
