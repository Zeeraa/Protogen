import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiBaseService } from '../api-base.service';
import { catchError, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VisorApiService extends ApiBaseService {
  constructor(
    http: HttpClient,
    toastr: ToastrService,
  ) {
    super(http, toastr);
  }

  getStatus(): Observable<VisorStatus> {
    return this.http.get(this.apiBaseUrl + "/visor/status").pipe(catchError(this.defaultErrorHandler)) as any as Observable<VisorStatus>;
  }

  getRenderers(): Observable<VisorRenderer[]> {
    return this.http.get(this.apiBaseUrl + "/visor/renderers").pipe(catchError(this.defaultErrorHandler)) as any as Observable<VisorRenderer[]>;
  }

  activateRenderer(id: string): Observable<VisorRenderer> {
    return this.http.post(this.apiBaseUrl + "/visor/renderers/" + id + "/activate", {}).pipe(catchError(this.defaultErrorHandler)) as any as Observable<VisorRenderer>;
  }

  saveCustomisableImageVisor(id: string, data: SaveCustomisableImageRendererPayload) {
    return this.http.put(this.apiBaseUrl + "/visor/renderers/" + id + "/customisable-image-renderer-data", data).pipe(catchError(this.defaultErrorHandler)) as any as Observable<CustomFaceData>;
  }

  deleteCustomisableImageVisor(id: string) {
    return this.http.delete(this.apiBaseUrl + "/visor/renderers/" + id + "/customisable-image-renderer-data").pipe(catchError(this.defaultErrorHandler)) as any as Observable<any>;
  }

  createBlankImageRenderer() {
    return this.http.post(this.apiBaseUrl + "/visor/renderers/new-image-renderer", {}).pipe(catchError(this.defaultErrorHandler)) as any as Observable<CreateImageRendererResult>;
  }

  getRenderer(id: string): Observable<VisorRenderer | null> {
    return this.http.get(this.apiBaseUrl + "/visor/renderers/" + id).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      }),
      catchError(this.defaultErrorHandler)
    ) as any as Observable<VisorRenderer | null>;
  }

  getPreviewBase64() {
    return new Promise<string>((resolve, reject) => {
      this.http.get(this.apiBaseUrl + "/visor/preview", { responseType: 'blob' }).pipe(catchError(err => {
        reject(err);
        throw err;
      })).subscribe(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    })
  }
}

export interface VisorStatus {
  activeRenderer: VisorRenderer | null;
  hasRenderLock: boolean;
  renderLocks: string[];
}

export interface VisorRenderer {
  name: string;
  id: string;
  preview: string | null;
  type: VisorRendererType;
  metadata: any;
}

export interface SaveCustomisableImageRendererPayload {
  name: string;
  image: string | null;
  mirrorImage: boolean;
  flipRightSide: boolean;
  flipLeftSide: boolean;
}

export interface CustomFaceData {
  uuid: string;
  name: string;
  mirrorImage: string;
  flipRightSide: string;
  flipLeftSide: string;
  image: string | null;
}

export interface CreateImageRendererResult {
  id: string;
}

export enum VisorRendererType {
  Face = "Face",
  StaticImage = "StaticImage",
  CustomisableImage = "CustomisableImage",
  Other = "Other",
}
