import { Component, computed, inject, OnDestroy, OnInit, signal, TemplateRef, viewChild } from '@angular/core';
import { ClockSettings, FlaschenTaschenSettings, NetworkInterfaceInfo, SystemApiService, SystemOverview } from '../../../../core/services/api/system-api.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { LocalStorageKey_ShowSentitiveNetworkingInfo } from '../../../../core/services/utils/LocalStorageKeys';
import { HudApiService } from '../../../../core/services/api/hud-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';
import { form } from '@angular/forms/signals'
import { hexToRgb, RGBColors, rgbToHex } from '../../../../core/services/utils/Utils';

@Component({
  selector: 'app-system-page',
  templateUrl: './system-page.component.html',
  styleUrl: './system-page.component.scss',
  standalone: false
})
export class SystemPageComponent implements OnInit, OnDestroy {
  private readonly toastr = inject(ToastrService);
  private readonly api = inject(SystemApiService);
  private readonly hudApi = inject(HudApiService);
  private readonly modal = inject(NgbModal);
  private readonly title = inject(Title);
  private readonly auth = inject(AuthService);

  protected readonly shutdownModalTemplate = viewChild<TemplateRef<any>>("shutdownModal");

  private readonly overview = signal<SystemOverview | null>(null);
  private updateInterval: any = null;
  private shutdownModalRef: null | NgbModalRef = null;

  readonly showSensitiveNetworkingData = signal<boolean>(false);
  readonly flaschenTaschenSettings = signal<FlaschenTaschenSettings>({ ledLimitRefresh: 100, ledSlowdownGpio: 3 });
  readonly networkInterfaces = signal<NetworkInterfaceInfo[]>([]);

  private readonly clockSettingsModel = signal({
    is24HourFormat: true,
    showSeconds: true,
    showDate: true,
    timeColor: "#FFFFFF",
    dateColor: "#FFFFFF"
  });

  protected readonly clockSettingsForm = form(this.clockSettingsModel);

  readonly hasConnectivity = computed(() => this.overview()?.network.hasConnectivity ?? false);
  readonly ip = computed(() => this.overview()?.network.ip ?? "Unknown");
  readonly isp = computed(() => this.overview()?.network.isp ?? "Unknown");
  readonly backendVersion = computed(() => this.overview()?.backendVersion ?? "Unknown");
  readonly osName = computed(() => this.overview()?.osVersion ?? "Unknown");
  readonly realTemperature = computed(() => this.overview()?.cpuTemperature ?? 0);
  readonly cpuUsage = computed(() => this.overview()?.cpuUsage ?? 0);
  readonly ramUsage = computed(() => this.overview()?.ramUsage ?? 0);
  readonly isSuperUser = computed(() => this.auth.authDetails?.isSuperUser ?? false);

  readonly tempBarValue = computed(() => {
    const temp = this.overview()?.cpuTemperature;
    if (temp == null || temp < 0) return 0;
    if (temp > 100) return 100;
    return temp;
  });

  readonly temperatureColor = computed(() => {
    const temp = this.overview()?.cpuTemperature;
    if (temp == null) return "success";
    if (temp > 80) return "danger";
    if (temp > 60) return "warning";
    return "success";
  });

  readonly cpuColor = computed(() => {
    const usage = this.overview()?.cpuUsage;
    if (usage == null) return "success";
    if (usage > 90) return "danger";
    if (usage > 70) return "warning";
    return "success";
  });

  readonly ramColor = computed(() => {
    const usage = this.overview()?.ramUsage;
    if (usage == null) return "success";
    if (usage > 90) return "danger";
    if (usage > 70) return "warning";
    return "success";
  });

  get swaggerUrl() {
    const apiBase = this.api.apiBaseUrl;
    return apiBase + (apiBase.endsWith("/") ? "" : "/");
  }

  get phpMyAdminLink() {
    return environment.phpMyAdminLink;
  }

  get hudEnabled() {
    return this.overview()?.hudEnabled ?? false;
  }

  set hudEnabled(enabled: boolean) {
    this.overview.update(o => o ? { ...o, hudEnabled: enabled } : o);
    this.hudApi.setHudEnabled(enabled).pipe(catchError(err => {
      this.toastr.error("Failed to toggle hud");
      throw err;
    })).subscribe();
  }

  get swaggerEnabled(): boolean {
    return this.overview()?.swaggerEnabled ?? false;
  }

  set swaggerEnabled(enabled: boolean) {
    this.api.setSwaggerEnabled(enabled).pipe(catchError(err => {
      this.toastr.error("Failed to " + (enabled ? "enable" : "disable") + " swagger");
      throw err;
    })).subscribe(() => {
      this.toastr.success("Swagger " + (enabled ? "enabled" : "disabled") + ". The system needs to be restarted before changes take effect");
    });
  }

  openShutdownModal() {
    this.shutdownModalRef?.close();
    const template = this.shutdownModalTemplate();
    if (template) {
      this.shutdownModalRef = this.modal.open(template, { ariaLabelledBy: 'shutdown-modal-title' });
    }
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
    this.api.updateFlaschenTaschenSettings(this.flaschenTaschenSettings())
      .pipe(catchError(err => {
        console.error(err);
        this.toastr.error("Failed to update settings");
        throw err;
      })).subscribe(() => {
        this.toastr.success("Settings updated");
      });
  }

  updateFlaschenTaschenSetting<K extends keyof FlaschenTaschenSettings>(key: K, value: FlaschenTaschenSettings[K]) {
    this.flaschenTaschenSettings.update(s => ({ ...s, [key]: value }));
  }

  update() {
    this.api.getOverview().pipe(catchError(err => {
      this.toastr.error("Failed to get system overview");
      throw err;
    })).subscribe(overview => {
      this.overview.set(overview);
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

  showNetworkDataChanged(checked: boolean) {
    this.showSensitiveNetworkingData.set(checked);
    localStorage.setItem(LocalStorageKey_ShowSentitiveNetworkingInfo, checked ? "true" : "false");
  }

  protected saveClockSettings() {
    const settings: ClockSettings = {
      is24HourFormat: this.clockSettingsModel().is24HourFormat,
      showSeconds: this.clockSettingsModel().showSeconds,
      showDate: this.clockSettingsModel().showDate,
      timeColor: hexToRgb(this.clockSettingsModel().timeColor) ?? RGBColors.White,
      dateColor: hexToRgb(this.clockSettingsModel().dateColor) ?? RGBColors.White,
    };

    this.api.updateClockSettings(settings).pipe(catchError(err => {
      this.toastr.error("Failed to save clock settings");
      console.error("Failed to save clock settings", err);
      return [];
    })).subscribe(() => {
      this.toastr.success("Clock settings saved");
    });
  }

  ngOnInit(): void {
    this.update();
    this.updateInterval = setInterval(() => {
      this.update();
    }, 2000);
    this.title.setTitle("System - Protogen");

    this.showSensitiveNetworkingData.set(localStorage.getItem(LocalStorageKey_ShowSentitiveNetworkingInfo) == "true");

    this.api.getNetworkInterfaces().pipe(
      catchError(err => {
        this.toastr.error("Failed to fetch network interfaces");
        console.error("Failed to fetch network interfaces", err);
        return [];
      })
    ).subscribe(interfaces => {
      this.networkInterfaces.set(interfaces);
    });

    this.api.getFlaschenTaschenSettings().pipe(
      catchError(err => {
        this.toastr.error("Failed to fetch flaschen taschen settings");
        throw err;
      })
    ).subscribe(settings => {
      this.flaschenTaschenSettings.set(settings);
    });

    this.api.getClockSettings().pipe(
      catchError(err => {
        this.toastr.error("Failed to fetch clock settings");
        console.error("Failed to fetch clock settings", err);
        throw [];
      })
    ).subscribe(settings => {
      console.debug("Fetched clock settings", settings);
      this.clockSettingsModel.set({
        is24HourFormat: settings.is24HourFormat,
        showSeconds: settings.showSeconds,
        showDate: settings.showDate,
        timeColor: rgbToHex(settings.timeColor),
        dateColor: rgbToHex(settings.dateColor)
      });
    });
  }

  ngOnDestroy(): void {
    if (this.updateInterval != null) {
      clearInterval(this.updateInterval);
    }
  }
}
