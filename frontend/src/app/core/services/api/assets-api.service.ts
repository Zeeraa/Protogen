import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AssetsApiService extends ApiBaseService {
  private _cache: BuiltInAsset[] | null = null;

  getAssets(useCache = true) {
    if (useCache && this._cache != null) {
      return of(this._cache);
    }
    return this.http.get<BuiltInAsset[]>(this.apiBaseUrl + "/assets").pipe(tap(assets => this._cache = assets));
  }

  getAssetUrl(asset: BuiltInAsset) {
    return this.apiBaseUrl + "/assets/" + asset.name;
  }
}

export interface BuiltInAsset {
  name: string;
  display_name: string;
  type: BuiltInAssetType;
  path: string;
  author?: AssetAuthor;
}

export interface AssetAuthor {
  name: string;
  links?: AuthorLink[];
}

export interface AuthorLink {
  service?: string;
  text: string;
  url: string;
}

export enum BuiltInAssetType {
  VISOR_TEXTURE = "VISOR_TEXTURE",
}
