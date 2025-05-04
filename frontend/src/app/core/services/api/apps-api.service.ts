import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppsApi extends ApiBaseService {
  constructor(
    http: HttpClient,
    toastr: ToastrService,
  ) {
    super(http, toastr);
  }

  getApps() {
    return this.http.get<AppList>(this.apiBaseUrl + "/apps").pipe(catchError(this.defaultErrorHandler));
  }

  getActiveApp() {
    return this.http.get<{ activeApp: App | null }>(this.apiBaseUrl + "/apps/active").pipe(
      catchError(this.defaultErrorHandler),
      map(response => response.activeApp)
    );
  }
}

export interface AppList {
  activeApp: App | null;
  apps: App[];
}

export interface App {
  name: string;
  displayName: string;
  options: AppOptions;
}


export interface AppOptions {
  useRenderer?: boolean;
  useRenderLock?: boolean;
}
