import { Component, computed, inject, OnDestroy, OnInit, signal, TemplateRef, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { ClockSettings, FlaschenTaschenSettings, NetworkInterfaceInfo, SystemApiService, SystemOverview, AudioDevice, WorkerConfig } from '../../../../core/services/api/system-api.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from 'ngx-yet-another-toast-library';
import { catchError, of, timeout } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { LocalStorageKey_ShowSentitiveNetworkingInfo } from '../../../../core/services/utils/LocalStorageKeys';
import { HudApiService } from '../../../../core/services/api/hud-api.service';
import { BackupApiService } from '../../../../core/services/api/backup-api.service';
import { FilesApiService } from '../../../../core/services/api/files-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';
import { form } from '@angular/forms/signals'
import { hexToRgb, RGBColors, rgbToHex } from '../../../../core/services/utils/Utils';
import { BootswatchThemes, Theme, ThemeService } from '../../../../core/services/theme.service';
import { SystemConfigService } from '../../../../core/services/system-config.service';
import { DevApi } from '../../../../core/services/api/discorvery-api.service';
import { ImageCroppedEvent } from 'ngx-image-cropper';

@Component({
  selector: 'app-system-page',
  templateUrl: './system-page.component.html',
  styleUrl: './system-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class SystemPageComponent implements OnInit, OnDestroy {
  private readonly toast = inject(ToastService);
  private readonly api = inject(SystemApiService);
  private readonly hudApi = inject(HudApiService);
  private readonly backupApi = inject(BackupApiService);
  private readonly filesApi = inject(FilesApiService);
  private readonly modal = inject(NgbModal);
  private readonly title = inject(Title);
  private readonly auth = inject(AuthService);
  private readonly discoveryApi = inject(DevApi);
  protected readonly themeService = inject(ThemeService);
  protected readonly systemConfig = inject(SystemConfigService);

  protected readonly bootswatchThemes = BootswatchThemes;
  protected readonly Theme = Theme;

  protected readonly shutdownModalTemplate = viewChild<TemplateRef<any>>("shutdownModal");
  protected readonly importModalTemplate = viewChild<TemplateRef<any>>("importModal");
  protected readonly importProgressModalTemplate = viewChild<TemplateRef<any>>("importProgressModal");
  protected readonly restartServerModalTemplate = viewChild<TemplateRef<any>>("restartServerModal");
  protected readonly iconModalTemplate = viewChild<TemplateRef<any>>("iconModal");

  private readonly overview = signal<SystemOverview | null>(null);
  private updateInterval: any = null;
  protected readonly showSensitiveNetworkingData = signal<boolean>(false);
  protected readonly flaschenTaschenSettings = signal<FlaschenTaschenSettings>({ ledLimitRefresh: 100, ledSlowdownGpio: 3 });
  protected readonly networkInterfaces = signal<NetworkInterfaceInfo[]>([]);
  protected readonly audioDevices = signal<AudioDevice[]>([]);
  protected readonly selectedAudioDeviceId = signal<number | null>(null);
  protected readonly workerConfig = signal<WorkerConfig | null>(null);
  protected readonly workerUrlInput = signal<string>('');
  protected readonly workerKeyInput = signal<string>('');
  protected readonly angularVersion = signal<string>("Unknown");

  protected readonly importFile = signal<File | null>(null);
  protected readonly importConfirmText = signal<string>('');
  protected readonly importUploadProgress = signal<number>(0);
  protected readonly importStatus = signal<'idle' | 'uploading' | 'importing' | 'done' | 'waiting-restart' | 'manual-restart' | 'error'>('idle');
  protected readonly importCanStart = computed(() =>
    this.importFile() !== null && this.importConfirmText().toLowerCase() === 'confirm'
  );

  private readonly CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
  private readonly USE_CHUNKED_UPLOAD_THRESHOLD = 50 * 1024 * 1024; // Use chunked upload for files > 50MB

  private importModalRef: NgbModalRef | null = null;
  private importProgressModalRef: NgbModalRef | null = null;
  private shutdownModalRef: null | NgbModalRef = null;
  private restartServerModalRef: NgbModalRef | null = null;
  private iconModalRef: NgbModalRef | null = null;
  private restartPollInterval: any = null;

  protected readonly iconPreviewVersion = signal<number>(Date.now());
  protected readonly iconCropFile = signal<File | null>(null);
  protected readonly iconCroppedBlob = signal<Blob | null>(null);

  protected readonly restartServerStatus = signal<'confirm' | 'waiting-restart' | 'error'>('confirm');

  private readonly clockSettingsModel = signal({
    is24HourFormat: true,
    showSeconds: true,
    showDate: true,
    timeColor: "#FFFFFF",
    dateColor: "#FFFFFF"
  });

  protected readonly clockSettingsForm = form(this.clockSettingsModel);

  protected readonly hasConnectivity = computed(() => this.overview()?.network.hasConnectivity ?? false);
  protected readonly ip = computed(() => this.overview()?.network.ip ?? "Unknown");
  protected readonly isp = computed(() => this.overview()?.network.isp ?? "Unknown");
  protected readonly backendVersion = computed(() => this.overview()?.backendVersion ?? "Unknown");
  protected readonly osName = computed(() => this.overview()?.osVersion ?? "Unknown");
  protected readonly realTemperature = computed(() => this.overview()?.cpuTemperature ?? 0);
  protected readonly cpuUsage = computed(() => this.overview()?.cpuUsage ?? 0);
  protected readonly ramUsage = computed(() => this.overview()?.ramUsage ?? 0);
  protected readonly isSuperUser = computed(() => this.auth.authDetails?.isSuperUser ?? false);

  protected readonly tempBarValue = computed(() => {
    const temp = this.overview()?.cpuTemperature;
    if (temp == null || temp < 0) return 0;
    if (temp > 100) return 100;
    return temp;
  });

  protected readonly temperatureColor = computed(() => {
    const temp = this.overview()?.cpuTemperature;
    if (temp == null) return "success";
    if (temp > 80) return "danger";
    if (temp > 60) return "warning";
    return "success";
  });

  protected readonly cpuColor = computed(() => {
    const usage = this.overview()?.cpuUsage;
    if (usage == null) return "success";
    if (usage > 90) return "danger";
    if (usage > 70) return "warning";
    return "success";
  });

  protected readonly ramColor = computed(() => {
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
      this.toast.error("Failed to toggle hud");
      throw err;
    })).subscribe();
  }

  protected get swaggerEnabled(): boolean {
    return this.overview()?.swaggerEnabled ?? false;
  }

  protected set swaggerEnabled(enabled: boolean) {
    this.api.setSwaggerEnabled(enabled).pipe(catchError(err => {
      this.toast.error("Failed to " + (enabled ? "enable" : "disable") + " swagger");
      throw err;
    })).subscribe(() => {
      this.toast.success("Swagger " + (enabled ? "enabled" : "disabled") + ". The system needs to be restarted before changes take effect");
    });
  }

  protected openImportModal() {
    this.importFile.set(null);
    this.importConfirmText.set('');
    this.importModalRef?.close();
    const template = this.importModalTemplate();
    if (template) {
      this.importModalRef = this.modal.open(template, { ariaLabelledBy: 'import-modal-title' });
    }
  }

  protected onImportFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.importFile.set(input.files?.[0] ?? null);
  }

  protected startImport() {
    const file = this.importFile();
    if (!file) return;

    this.importModalRef?.close();
    this.importUploadProgress.set(0);
    this.importStatus.set('uploading');

    const template = this.importProgressModalTemplate();
    if (template) {
      this.importProgressModalRef = this.modal.open(template, {
        ariaLabelledBy: 'import-progress-modal-title',
        backdrop: 'static',
        keyboard: false,
      });
    }

    // Use chunked upload for large files
    if (file.size > this.USE_CHUNKED_UPLOAD_THRESHOLD) {
      this.startChunkedImport(file);
    } else {
      this.startRegularImport(file);
    }
  }

  private startRegularImport(file: File) {
    this.backupApi.importBackup(file).pipe(
      catchError(err => {
        this.importStatus.set('error');
        console.error('Backup import failed', err);
        return [];
      })
    ).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress) {
        const progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
        this.importUploadProgress.set(progress);
        if (progress >= 100) {
          this.importStatus.set('importing');
        }
      } else if (event.type === HttpEventType.Response) {
        if (event.ok) {
          this.killIntervals();
          const autoRestart = event.body?.autoRestart ?? false;
          if (autoRestart) {
            this.importStatus.set('waiting-restart');
            this.startRestartPolling();
          } else {
            this.importStatus.set('manual-restart');
          }
        } else {
          this.importStatus.set('error');
          console.error('Backup import failed with status', event.status, event.body);
        }
      }
    });
  }

  private async startChunkedImport(file: File) {
    try {
      const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
      let uploadId: string | null = null;

      // Upload chunks sequentially
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        // First chunk includes metadata to create the session
        const isFirstChunk = chunkIndex === 0;

        await new Promise<void>((resolve, reject) => {
          this.backupApi.uploadChunk(
            uploadId,
            chunkIndex,
            chunk,
            isFirstChunk ? file.name : undefined,
            isFirstChunk ? totalChunks : undefined,
            isFirstChunk ? file.size : undefined
          ).pipe(
            catchError(err => {
              console.error(`Failed to upload chunk ${chunkIndex}`, err);
              reject(err);
              return [];
            })
          ).subscribe({
            next: (event) => {
              if (event.type === HttpEventType.UploadProgress) {
                // Calculate overall progress: (completed chunks + current chunk progress) / total chunks
                const chunkProgress = event.total ? (event.loaded / event.total) : 0;
                const overallProgress = Math.round(((chunkIndex + chunkProgress) / totalChunks) * 100);
                this.importUploadProgress.set(overallProgress);
              } else if (event.type === HttpEventType.Response) {
                if (event.ok && event.body) {
                  // Store uploadId from the first chunk response
                  if (isFirstChunk && event.body.uploadId) {
                    uploadId = event.body.uploadId;
                  }
                  resolve();
                } else {
                  reject(new Error(`Chunk ${chunkIndex} upload failed with status ${event.status}`));
                }
              }
            },
            error: (err) => {
              console.error(`Failed to upload chunk ${chunkIndex}`, err);
              reject(err);
            }
          });
        });
      }

      // All chunks uploaded, now complete the upload
      this.importUploadProgress.set(100);
      this.importStatus.set('importing');

      if (!uploadId) {
        throw new Error('Upload ID not received from server');
      }

      this.backupApi.completeChunkUpload(uploadId).pipe(
        catchError(err => {
          this.importStatus.set('error');
          console.error('Failed to complete chunked upload', err);
          this.toast.error('Failed to assemble and import backup');
          return [];
        })
      ).subscribe({
        next: (result) => {
          this.killIntervals();
          const autoRestart = result.autoRestart ?? false;
          if (autoRestart) {
            this.importStatus.set('waiting-restart');
            this.startRestartPolling();
          } else {
            this.importStatus.set('manual-restart');
          }
        },
        error: (err) => {
          this.importStatus.set('error');
          console.error('Failed to complete chunked upload', err);
          this.toast.error('Failed to assemble and import backup');
        }
      });
    } catch (err) {
      this.importStatus.set('error');
      console.error('Chunked import failed', err);
      this.toast.error('Failed to upload backup file');
    }
  }

  private killIntervals() {
    if (this.updateInterval != null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.restartPollInterval != null) {
      clearInterval(this.restartPollInterval);
      this.restartPollInterval = null;
    }
  }

  private startRestartPolling() {
    setTimeout(() => {
      this.restartPollInterval = setInterval(() => {
        this.discoveryApi.getDiscoveryInfo({ timeout: 3000 }).pipe(
          timeout(3000),
          catchError(() => of(null))
        ).subscribe(result => {
          if (result?.sessionId) {
            clearInterval(this.restartPollInterval);
            this.restartPollInterval = null;
            window.location.reload();
          }
        });
      }, 5000);
    }, 5000);
  }

  protected closeImportProgressModal() {
    if (this.importStatus() === 'waiting-restart') return;
    this.importProgressModalRef?.close();
    this.importStatus.set('idle');
  }

  protected downloadBackup() {
    this.backupApi.getDownloadToken().pipe(catchError(err => {
      this.toast.error('Failed to get backup download token');
      throw err;
    })).subscribe(({ token }) => {
      this.toast.info('Download started. It might take a bit of time to prepare the file for download.', undefined, { duration: 8000 });
      const a = document.createElement('a');
      a.href = this.api.apiBaseUrl + '/backup/download?token=' + encodeURIComponent(token);
      a.download = 'backup.tar.gz';
      a.click();
    });
  }

  protected openShutdownModal() {
    this.shutdownModalRef?.close();
    const template = this.shutdownModalTemplate();
    if (template) {
      this.shutdownModalRef = this.modal.open(template, { ariaLabelledBy: 'shutdown-modal-title' });
    }
  }

  protected restartFlaschenTaschen() {
    this.api.restartFlaschenTaschen().pipe(catchError(err => {
      console.error(err);
      this.toast.error("Failed to run command");
      throw err;
    })).subscribe(() => {
      this.toast.success("Restarting service");
    });
  }

  protected saveFlaschenTaschen() {
    this.api.updateFlaschenTaschenSettings(this.flaschenTaschenSettings())
      .pipe(catchError(err => {
        console.error(err);
        this.toast.error("Failed to update settings");
        throw err;
      })).subscribe(() => {
        this.toast.success("Settings updated");
      });
  }

  protected updateFlaschenTaschenSetting<K extends keyof FlaschenTaschenSettings>(key: K, value: FlaschenTaschenSettings[K]) {
    this.flaschenTaschenSettings.update(s => ({ ...s, [key]: value }));
  }

  protected update() {
    this.api.getOverview().pipe(catchError(err => {
      this.toast.error("Failed to get system overview");
      throw err;
    })).subscribe(overview => {
      this.overview.set(overview);
    });
  }

  protected shutdown() {
    this.shutdownModalRef?.close();
    this.toast.info("Executing poweroff command...");
    this.api.shutdown().pipe(catchError(err => {
      console.error(err);
      this.toast.error("Failed to run command");
      throw err;
    })).subscribe(() => {
      this.toast.success("Shutdown command executed!");
    });
  }

  protected restartServer() {
    this.restartServerStatus.set('confirm');
    this.restartServerModalRef?.close();
    const template = this.restartServerModalTemplate();
    if (template) {
      this.restartServerModalRef = this.modal.open(template, { ariaLabelledBy: 'restart-server-modal-title', backdrop: 'static', keyboard: false });
    }
  }

  protected confirmRestartServer() {
    this.restartServerStatus.set('waiting-restart');
    this.api.restart().pipe(catchError(err => {
      console.error(err);
      this.restartServerStatus.set('error');
      throw err;
    })).subscribe(() => {
      this.killIntervals();
      this.startRestartPolling();
    });
  }

  protected closeRestartServerModal() {
    if (this.restartServerStatus() === 'waiting-restart') return;
    this.restartServerModalRef?.close();
    this.restartServerStatus.set('confirm');
  }

  protected showNetworkDataChanged(checked: boolean) {
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
      this.toast.error("Failed to save clock settings");
      console.error("Failed to save clock settings", err);
      return [];
    })).subscribe(() => {
      this.toast.success("Clock settings saved");
    });
  }

  protected onAudioDeviceChange(deviceId: number) {
    this.api.setAudioDevice(deviceId).pipe(catchError(err => {
      this.toast.error("Failed to set audio device");
      console.error("Failed to set audio device", err);
      throw err;
    })).subscribe(() => {
      this.selectedAudioDeviceId.set(deviceId);
      this.toast.success("Audio device updated");
    });
  }

  protected saveWorkerConfig() {
    const url = this.workerUrlInput().trim() || null;
    const key = this.workerKeyInput() || null;
    this.api.updateWorkerConfig(url, key).pipe(catchError(err => {
      this.toast.error("Failed to save worker configuration");
      console.error("Failed to save worker configuration", err);
      return [];
    })).subscribe(config => {
      this.workerConfig.set(config);
      this.workerUrlInput.set(config.url ?? '');
      this.workerKeyInput.set('');
      this.toast.success("Worker configuration saved");
    });
  }

  ngOnInit(): void {
    this.angularVersion.set(document.querySelector('app-root')?.getAttribute('ng-version') ?? "Unknown");
    this.update();
    this.updateInterval = setInterval(() => {
      this.update();
    }, 2000);
    this.title.setTitle("System - Protogen");

    this.showSensitiveNetworkingData.set(localStorage.getItem(LocalStorageKey_ShowSentitiveNetworkingInfo) == "true");

    this.api.getNetworkInterfaces().pipe(
      catchError(err => {
        this.toast.error("Failed to fetch network interfaces");
        console.error("Failed to fetch network interfaces", err);
        return [];
      })
    ).subscribe(interfaces => {
      this.networkInterfaces.set(interfaces);
    });

    this.api.getFlaschenTaschenSettings().pipe(
      catchError(err => {
        this.toast.error("Failed to fetch flaschen taschen settings");
        throw err;
      })
    ).subscribe(settings => {
      this.flaschenTaschenSettings.set(settings);
    });

    this.api.getClockSettings().pipe(
      catchError(err => {
        this.toast.error("Failed to fetch clock settings");
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

    this.api.getAudioDevices().pipe(
      catchError(err => {
        this.toast.error("Failed to fetch audio devices");
        console.error("Failed to fetch audio devices", err);
        return [];
      })
    ).subscribe(devices => {
      this.audioDevices.set(devices);
      const defaultDevice = devices.find(d => d.isDefault);
      if (defaultDevice) {
        this.selectedAudioDeviceId.set(defaultDevice.id);
      }
    });

    this.api.getWorkerConfig().pipe(
      catchError(err => {
        this.toast.error("Failed to fetch worker configuration");
        console.error("Failed to fetch worker configuration", err);
        return [];
      })
    ).subscribe(config => {
      this.workerConfig.set(config);
      this.workerUrlInput.set(config.url ?? '');
    });
  }

  protected openIconModal() {
    this.iconCropFile.set(null);
    this.iconCroppedBlob.set(null);
    const template = this.iconModalTemplate();
    if (template) {
      this.iconModalRef = this.modal.open(template, { ariaLabelledBy: 'icon-modal-title', size: 'lg' });
    }
  }

  protected onIconFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.iconCropFile.set(input.files?.[0] ?? null);
    this.iconCroppedBlob.set(null);
  }

  protected onIconCropped(event: ImageCroppedEvent) {
    this.iconCroppedBlob.set(event.blob ?? null);
  }

  protected applyIcon() {
    const blob = this.iconCroppedBlob();
    if (!blob) return;
    const file = new File([blob], 'icon.png', { type: 'image/png' });
    this.filesApi.uploadIcon(file).pipe(catchError(err => {
      this.toast.error('Failed to upload icon');
      console.error(err);
      return [];
    })).subscribe(() => {
      this.iconModalRef?.close();
      this.iconPreviewVersion.set(Date.now());
      this.toast.success('Icon updated');
    });
  }

  protected resetIcon() {
    this.filesApi.clearIcon().pipe(catchError(err => {
      this.toast.error('Failed to reset icon');
      console.error(err);
      return [];
    })).subscribe(() => {
      this.iconPreviewVersion.set(Date.now());
      this.toast.success('Icon reset to default');
    });
  }

  ngOnDestroy(): void {
    this.killIntervals();
  }
}
