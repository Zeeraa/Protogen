import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiBaseService } from '../api-base.service';
import { catchError, Observable } from 'rxjs';

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
}
