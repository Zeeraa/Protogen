import { Injectable } from "@angular/core";
import { ApiBaseService } from "../api-base.service";

@Injectable({
  providedIn: 'root'
})
export class DevApi extends ApiBaseService {
  getDiscoveryInfo(options: Partial<DiscoveryOptions> = {}) {
    return this.http.get<{ sessionId: string }>(this.apiBaseUrl + "/discovery", {
      timeout: options.timeout ?? 10_000,
    });
  }
}

interface DiscoveryOptions {
  // Timeout in ms for request. Default: 10 000
  timeout: number;
}