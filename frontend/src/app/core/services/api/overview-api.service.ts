import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OverviewApiService extends ApiBaseService {
  getOverview() {
    return this.http.get<OverviewData>(this.apiBaseUrl + "/overview");
  }
}

export interface OverviewData {
  renderer: OverviewNamedObjectData | null;
  expression: OverviewNamedObjectData | null;
  faceRgbEffect: OverviewNamedObjectData | null;
  rgbEffect: OverviewNamedObjectData | null;
  boopSensorProfile: OverviewNamedObjectData | null;
  hudEnabled: boolean;
  boopSensorEnabled: boolean;
  hasRenderLock: boolean;
}

export interface OverviewNamedObjectData {
  id: string;
  name: string;
}