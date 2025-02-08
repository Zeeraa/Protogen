import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FlaschenTaschenSettings, SystemApiService, SystemOverview } from '../../../../core/services/api/system-api.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { LocalStorageKey_ShowSentitiveNetworkingInfo } from '../../../../core/services/utils/LocalStorageKeys';
import { HudApiService } from '../../../../core/services/api/hud-api.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-system-page',
  templateUrl: './system-page.component.html',
  styleUrl: './system-page.component.scss'
})
export class SystemPageComponent implements OnInit, OnDestroy {
  @ViewChild("shutdownModal") shutdownModalTemplate!: TemplateRef<any>;
  overview: SystemOverview | null = null;
  updateInterval: any = null;
  shutdownModalRef: null | NgbModalRef = null;
  showSensitiveNetworkingData = false;
  flaschenTaschenSettings: FlaschenTaschenSettings = { ledLimitRefresh: 100, ledSlowdownGpio: 3 }

  get hasConnectivity() {
    return this.overview?.network.hasConnectivity || false;
  }

  get swaggerUrl() {
    const apiBase = this.api.apiBaseUrl;

    return apiBase + (apiBase.endsWith("/") ? "" : "/");
  }

  get ip() {
    if (this.overview?.network.ip != null) {
      return this.overview?.network.ip;
    }
    return "Unknown";
  }

  get hudEnabled() {
    return this.overview?.hudEnabled || false;
  }

  set hudEnabled(enabled: boolean) {
    if (this.overview != null) {
      this.overview.hudEnabled = enabled;
    }
    this.hudApi.setHudEnabled(enabled).pipe(catchError(err => {
      this.toastr.error("Failed to toggle hud");
      throw err;
    })).subscribe();
  }

  get swaggerEnabled(): boolean {
    return this.overview?.swaggerEnabled || false;
  }

  set swaggerEnabled(enabled: boolean) {
    this.api.setSwaggerEnabled(enabled).pipe(catchError(err => {
      this.toastr.error("Failed to " + (enabled ? "enable" : "disable") + " swagger");
      throw err;
    })).subscribe(() => {
      this.toastr.success("Swagger " + (enabled ? "enabled" : "disabled") + ". The system needs to be restarted before changes take effect");
    });
  }

  get isp() {
    if (this.overview?.network.isp != null) {
      return this.overview?.network.isp;
    }
    return "Unknown";
  }

  get temperatureColor() {
    if (this.overview != null) {
      if (this.overview.cpuTemperature > 80) {
        return "danger";
      }

      if (this.overview.cpuTemperature > 60) {
        return "warning";
      }
    }
    return "success";
  }

  get realTemperature() {
    return this.overview?.cpuTemperature || 0;
  }

  get tempBarValue() {
    if (this.overview == null || this.overview.cpuTemperature < 0) {
      return 0;
    }

    if (this.overview.cpuTemperature > 100) {
      return 100;
    }

    return this.overview.cpuTemperature;
  }

  get cpuUsage() {
    if (this.overview?.cpuUsage !== undefined) {
      return this.overview.cpuUsage;
    }
    return 0;
  }

  get ramUsage() {
    if (this.overview?.ramUsage !== undefined) {
      return this.overview.ramUsage;
    }
    return 0;
  }

  get getTemperature() {
    if (this.overview?.cpuTemperature !== undefined) {
      return this.overview.cpuTemperature;
    }
    return 0;
  }

  get osName() {
    return this.overview?.osVersion || "Unknown";
  }

  openShutdownModal() {
    this.shutdownModalRef?.close();
    this.shutdownModalRef = this.modal.open(this.shutdownModalTemplate, { ariaLabelledBy: 'shutdown-modal-title' });
  }

  restartFlaschenTaschen() {
    this.api.restartFlaschenTaschen().pipe(catchError(err => {
      console.error(err);
      this.toastr.error("Failed to run command");
      throw err;
    })).subscribe(() => {
      this.toastr.success("Restarting service");
    });
  }

  saveFlaschenTaschen() {
    this.api.updateFlaschenTaschenSettings(this.flaschenTaschenSettings)
      .pipe(catchError(err => {
        console.error(err);
        this.toastr.error("Failed to update settings");
        throw err;
      })).subscribe(() => {
        this.toastr.success("Settings updated");
      });
  }

  update() {
    this.api.getOverview().pipe(catchError(err => {
      this.toastr.error("Failed to get system overview");
      throw err;
    })).subscribe(overview => {
      this.overview = overview;
    });
  }

  shutdown() {
    this.shutdownModalRef?.close();
    this.toastr.info("Executing poweroff command...");
    this.api.shutdown().pipe(catchError(err => {
      console.error(err);
      this.toastr.error("Failed to run command");
      throw err;
    })).subscribe(() => {
      this.toastr.success("Shutdown command executed!");
    });
  }

  showNetworkDataChanged(event: Event) {
    const element = event.target as HTMLInputElement
    const checked = element.checked;
    localStorage.setItem(LocalStorageKey_ShowSentitiveNetworkingInfo, checked ? "true" : "false");
  }

  get isSuperUser() {
    return this.auth.authDetails?.isSuperUser || false;
  }

  constructor(
    private toastr: ToastrService,
    private api: SystemApiService,
    private hudApi: HudApiService,
    private modal: NgbModal,
    private title: Title,
    private auth: AuthService,
  ) { }

  ngOnInit(): void {
    this.update();
    this.updateInterval = setInterval(() => {
      this.update();
    }, 2000);
    this.title.setTitle("System - Protogen");

    this.showSensitiveNetworkingData = localStorage.getItem(LocalStorageKey_ShowSentitiveNetworkingInfo) == "true";

    this.api.getFlaschenTaschenSettings().pipe(
      catchError(err => {
        this.toastr.error("Failed to fetch flaschen taschen settings");
        throw err;
      })
    ).subscribe(settings => {
      this.flaschenTaschenSettings = settings;
    })
  }

  ngOnDestroy(): void {
    if (this.updateInterval != null) {
      clearInterval(this.updateInterval);
    }
  }
}
