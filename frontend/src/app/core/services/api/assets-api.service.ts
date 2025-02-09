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

  /**
   * Get asset image by the asset name. Only works if assets has been cached.
   * @param name The name of the asset to load
   * @returns Image path or null if not found
   */
  getAssetUrlByName(name: string): string | null {
    const asset = this._cache?.find(asset => asset.name === name);
    if (asset == null) {
      return null;
    }
    return this.apiBaseUrl + "/assets/" + asset.name;
  }
}

export interface BuiltInAsset {
  group: string;
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
