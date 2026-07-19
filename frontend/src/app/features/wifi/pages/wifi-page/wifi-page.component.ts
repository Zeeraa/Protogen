import { Component, inject, OnDestroy, OnInit, signal, TemplateRef, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs';
import { ToastService } from 'ngx-yet-another-toast-library';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { form, required } from '@angular/forms/signals';
import { WifiApiService, WifiNetworkProfile, WifiCredentials } from '../../../../core/services/api/wifi-api.service';

interface WifiForm {
  ssid: string;
  security: "wpa-psk" | "open";
  password: string;
  autoconnect: boolean;
  autoconnectPriority: number;
}

@Component({
  selector: 'app-wifi-page',
  templateUrl: './wifi-page.component.html',
  styleUrl: './wifi-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class WifiPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(WifiApiService);
  private readonly toast = inject(ToastService);
  private readonly title = inject(Title);
  private readonly modal = inject(NgbModal);

  protected readonly savedNetworks = signal<WifiNetworkProfile[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly busyNetworks = signal<Set<string>>(new Set());

  // Form Signals using Angular Signal Forms
  protected readonly fifiFormModel = signal<WifiForm>({
    ssid: "",
    security: "wpa-psk",
    password: "",
    autoconnect: true,
    autoconnectPriority: 0,
  });

  protected readonly wifiForm = form(this.fifiFormModel, (schemaPath) => {
    required(schemaPath.ssid, { message: "SSID is required" });
    required(schemaPath.security, { message: "Security type is required" });
    required(schemaPath.password, { message: "Password is required", when: ({ valueOf }) => valueOf(schemaPath.security) === "wpa-psk" });
  });

  // Add/Edit Network Modal
  private networkModalRef: NgbModalRef | null = null;
  private readonly networkModalTemplate = viewChild.required<TemplateRef<unknown>>("networkModal");
  protected readonly modalTitle = signal<string>("Add Wi-Fi Network");
  protected readonly isEditing = signal<boolean>(false);
  protected readonly editingUuid = signal<string | null>(null);
  protected readonly editingProfile = signal<WifiNetworkProfile | null>(null);

  // Delete Profile Modal
  private deleteModalRef: NgbModalRef | null = null;
  private readonly deleteModalTemplate = viewChild.required<TemplateRef<unknown>>("deleteModal");
  protected readonly deletingProfile = signal<WifiNetworkProfile | null>(null);

  // Disconnect Confirmation Modal
  private disconnectModalRef: NgbModalRef | null = null;
  private readonly disconnectModalTemplate = viewChild.required<TemplateRef<unknown>>("disconnectModal");
  protected readonly disconnectingProfile = signal<WifiNetworkProfile | null>(null);
  protected readonly activeDisconnectingNetworks = signal<Set<string>>(new Set());

  // Switch Network Confirmation Modal
  private switchModalRef: NgbModalRef | null = null;
  private readonly switchModalTemplate = viewChild.required<TemplateRef<unknown>>("switchModal");
  protected readonly switchingTargetProfile = signal<WifiNetworkProfile | null>(null);
  protected readonly switchingCurrentProfile = signal<WifiNetworkProfile | null>(null);

  private refreshInterval: any = null;

  constructor() {
    this.title.setTitle("Wi-Fi Settings - Protogen");
  }

  ngOnInit(): void {
    this.refresh();
    // Refresh the Wi-Fi connection states periodically
    this.refreshInterval = setInterval(() => this.refreshQuietly(), 5000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval != null) {
      clearInterval(this.refreshInterval);
    }
    this.networkModalRef?.close();
    this.deleteModalRef?.close();
    this.disconnectModalRef?.close();
    this.switchModalRef?.close();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.api.getSavedNetworks().pipe(
      catchError((err: HttpErrorResponse) => {
        this.toast.error(err.error?.message || "Failed to get saved Wi-Fi networks");
        this.loading.set(false);
        return [];
      })
    ).subscribe((networks) => {
      this.savedNetworks.set(networks);
      this.loading.set(false);
    });
  }

  private refreshQuietly(): void {
    this.api.getSavedNetworks().pipe(
      catchError((_err: HttpErrorResponse) => {
        return [];
      })
    ).subscribe((networks) => {
      this.savedNetworks.set(networks);
    });
  }

  protected openAddModal(): void {
    this.isEditing.set(false);
    this.editingUuid.set(null);
    this.editingProfile.set(null);
    this.modalTitle.set("Add Wi-Fi Connection");

    this.wifiForm().reset();

    this.fifiFormModel.set({
      ssid: "",
      security: "wpa-psk",
      password: "",
      autoconnect: true,
      autoconnectPriority: 0
    });

    this.networkModalRef = this.modal.open(this.networkModalTemplate(), { centered: true, backdrop: "static", keyboard: false });
  }

  protected openEditModal(profile: WifiNetworkProfile): void {
    this.isEditing.set(true);
    this.editingUuid.set(profile.uuid);
    this.editingProfile.set(profile);
    this.modalTitle.set("Edit Wi-Fi Connection");

    this.wifiForm().reset();

    this.fifiFormModel.set({
      ssid: profile.ssid,
      security: profile.security === "wpa-psk" ? "wpa-psk" : "open",
      password: profile.security === "wpa-psk" ? "********" : "",
      autoconnect: profile.autoconnect,
      autoconnectPriority: profile.autoconnectPriority ?? 0
    });

    this.networkModalRef = this.modal.open(this.networkModalTemplate(), { centered: true, backdrop: "static", keyboard: false });
  }

  protected saveNetwork(): void {
    if (this.wifiForm().invalid()) {
      this.toast.warning("Please fill in all required fields.");
      return;
    }

    const val = this.fifiFormModel();
    const creds: WifiCredentials = {
      name: val.ssid.trim(),
      ssid: val.ssid.trim(),
      security: val.security,
      autoconnect: val.autoconnect,
      autoconnectPriority: Number(val.autoconnectPriority) || 0
    };

    // Only send password if we are editing and it's not the placeholder,
    // or if we are creating a new profile.
    if (val.security === "wpa-psk") {
      if (val.password && val.password !== "********") {
        creds.password = val.password;
      }
    }

    if (this.isEditing() && this.editingUuid()) {
      const uuid = this.editingUuid()!;
      this.api.editNetwork(uuid, creds).pipe(
        catchError((err: HttpErrorResponse) => {
          this.toast.error(err.error?.message || "Failed to edit connection profile");
          return [];
        })
      ).subscribe(() => {
        this.toast.success(`Connection profile "${creds.name}" saved!`);
        this.networkModalRef?.close();
        this.refresh();
      });
    } else {
      this.api.addNetwork(creds).pipe(
        catchError((err: HttpErrorResponse) => {
          this.toast.error(err.error?.message || "Failed to create connection profile");
          return [];
        })
      ).subscribe(() => {
        this.toast.success(`Connection profile "${creds.name}" created!`);
        this.networkModalRef?.close();
        this.refresh();
      });
    }
  }

  protected openDeleteModal(profile: WifiNetworkProfile): void {
    this.deletingProfile.set(profile);
    this.deleteModalRef = this.modal.open(this.deleteModalTemplate(), { centered: true });
  }

  protected confirmDelete(): void {
    const profile = this.deletingProfile();
    if (!profile) return;

    this.markBusy(profile.uuid);
    this.api.deleteNetwork(profile.uuid).pipe(
      catchError((err: HttpErrorResponse) => {
        this.toast.error(err.error?.message || "Failed to delete connection profile");
        this.unmarkBusy(profile.uuid);
        return [];
      })
    ).subscribe(() => {
      this.toast.success(`Connection profile "${profile.name}" deleted`);
      this.unmarkBusy(profile.uuid);
      this.deleteModalRef?.close();
      this.refresh();
    });
  }

  protected connectNetwork(profile: WifiNetworkProfile): void {
    const previouslyConnected = this.savedNetworks().find(n => n.status === 'connected');

    if (previouslyConnected && previouslyConnected.uuid !== profile.uuid) {
      // Show switch warning modal instead of connecting immediately
      this.switchingTargetProfile.set(profile);
      this.switchingCurrentProfile.set(previouslyConnected);
      this.switchModalRef = this.modal.open(this.switchModalTemplate(), { centered: true });
      return;
    }

    this.executeConnectNetwork(profile, previouslyConnected);
  }

  protected confirmSwitchNetwork(): void {
    const target = this.switchingTargetProfile();
    const current = this.switchingCurrentProfile();
    if (!target) return;

    this.switchModalRef?.close();
    this.executeConnectNetwork(target, current || undefined);
  }

  private executeConnectNetwork(profile: WifiNetworkProfile, previouslyConnected?: WifiNetworkProfile): void {
    this.markBusy(profile.uuid);
    this.api.connectNetwork(profile.uuid).pipe(
      catchError((err: HttpErrorResponse) => {
        this.toast.error(err.error?.message || "Failed to connect to network");
        this.unmarkBusy(profile.uuid);

        if (previouslyConnected && previouslyConnected.uuid !== profile.uuid) {
          this.toast.info(`Attempting to recover previous connection to "${previouslyConnected.name}"...`);
          this.markBusy(previouslyConnected.uuid);
          this.api.connectNetwork(previouslyConnected.uuid).pipe(
            catchError((recoverErr: HttpErrorResponse) => {
              this.toast.error(recoverErr.error?.message || `Failed to recover connection to "${previouslyConnected.name}"`);
              this.unmarkBusy(previouslyConnected.uuid);
              return [];
            })
          ).subscribe(() => {
            this.toast.success(`Recovered connection to "${previouslyConnected.name}"!`);
            this.unmarkBusy(previouslyConnected.uuid);
            this.refresh();
          });
        }

        return [];
      })
    ).subscribe(() => {
      this.toast.success(`Connecting to network "${profile.name}"...`);
      this.unmarkBusy(profile.uuid);
      this.refresh();
    });
  }

  protected openDisconnectModal(profile: WifiNetworkProfile): void {
    this.disconnectingProfile.set(profile);
    this.disconnectModalRef = this.modal.open(this.disconnectModalTemplate(), { centered: true });
  }

  protected confirmDisconnect(): void {
    const profile = this.disconnectingProfile();
    if (!profile) return;

    this.disconnectModalRef?.close();

    this.toast.success(`Disconnect request sent for "${profile.name}"`);

    // Fire and forget!
    this.api.disconnectNetwork(profile.uuid).subscribe({
      next: () => {
        this.refresh();
      },
      error: () => {
        this.refresh();
      }
    });
  }

  protected isNetworkBusy(uuid: string): boolean {
    return this.busyNetworks().has(uuid);
  }

  protected isNetworkDisconnecting(uuid: string): boolean {
    return this.activeDisconnectingNetworks().has(uuid);
  }

  private markBusy(uuid: string): void {
    this.busyNetworks.update(set => {
      const next = new Set(set);
      next.add(uuid);
      return next;
    });
  }

  private unmarkBusy(uuid: string): void {
    this.busyNetworks.update(set => {
      const next = new Set(set);
      next.delete(uuid);
      return next;
    });
  }

  private markDisconnecting(uuid: string): void {
    this.activeDisconnectingNetworks.update(set => {
      const next = new Set(set);
      next.add(uuid);
      return next;
    });
  }

  private unmarkDisconnecting(uuid: string): void {
    this.activeDisconnectingNetworks.update(set => {
      const next = new Set(set);
      next.delete(uuid);
      return next;
    });
  }
}