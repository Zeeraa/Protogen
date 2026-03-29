import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { BluetoothApiService, BluetoothDevice, RfkillStatus } from '../../../../core/services/api/bluetooth-api.service';
import { ToastrService } from 'ngx-toastr';
import { Title } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-bluetooth-page',
  templateUrl: './bluetooth-page.component.html',
  styleUrl: './bluetooth-page.component.scss',
  standalone: false
})
export class BluetoothPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(BluetoothApiService);
  private readonly toastr = inject(ToastrService);
  private readonly title = inject(Title);

  private pollInterval: any = null;

  protected readonly pairedDevices = signal<BluetoothDevice[]>([]);
  protected readonly discoveredDevices = signal<BluetoothDevice[]>([]);
  protected readonly scanning = signal<boolean>(false);
  protected readonly loading = signal<boolean>(true);
  protected readonly busyDevices = signal<Set<string>>(new Set());
  protected readonly rfkillStatus = signal<RfkillStatus | null>(null);
  protected readonly rfkillUnblocking = signal<boolean>(false);

  /**
   * Discovered devices that are NOT already paired — avoids showing duplicates.
   */
  protected readonly newDevices = computed(() => {
    const pairedMacs = new Set(this.pairedDevices().map(d => d.macAddress));
    return this.discoveredDevices().filter(d => !pairedMacs.has(d.macAddress));
  });

  ngOnInit(): void {
    this.title.setTitle("Bluetooth - Protogen");
    this.checkRfkill();
    this.refresh();
    this.pollInterval = setInterval(() => this.pollScanStatus(), 2000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval != null) {
      clearInterval(this.pollInterval);
    }
  }

  protected refresh(): void {
    this.loading.set(true);
    this.api.getPairedDevices().pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to get paired devices");
        this.loading.set(false);
        return [];
      }),
    ).subscribe((devices) => {
      this.pairedDevices.set(devices);
      this.loading.set(false);
    });

    this.api.getDiscoveredDevices().pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to get discovered devices");
        return [];
      }),
    ).subscribe((devices) => this.discoveredDevices.set(devices));

    this.api.getScanStatus().pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to get scan status");
        return [];
      }),
    ).subscribe((status) => this.scanning.set(status.scanning));
  }

  protected startScan(): void {
    this.scanning.set(true);
    this.api.startScan(15).pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to start scan");
        this.scanning.set(false);
        return [];
      }),
    ).subscribe(() => this.toastr.info("Scanning for devices..."));
  }

  protected stopScan(): void {
    this.api.stopScan().pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to stop scan");
        return [];
      }),
    ).subscribe(() => {
      this.scanning.set(false);
      this.refreshDiscovered();
    });
  }

  protected connectDevice(device: BluetoothDevice): void {
    this.markBusy(device.macAddress);
    this.api.connectDevice(device.macAddress).pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to connect to device");
        this.unmarkBusy(device.macAddress);
        return [];
      }),
    ).subscribe(() => {
      this.toastr.success("Connected to " + device.name);
      this.unmarkBusy(device.macAddress);
      this.refresh();
    });
  }

  protected disconnectDevice(device: BluetoothDevice): void {
    this.markBusy(device.macAddress);
    this.api.disconnectDevice(device.macAddress).pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to disconnect from device");
        this.unmarkBusy(device.macAddress);
        return [];
      }),
    ).subscribe(() => {
      this.toastr.success("Disconnected from " + device.name);
      this.unmarkBusy(device.macAddress);
      this.refresh();
    });
  }

  protected pairDevice(device: BluetoothDevice): void {
    this.markBusy(device.macAddress);
    this.api.pairDevice(device.macAddress).pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to pair device");
        this.unmarkBusy(device.macAddress);
        return [];
      }),
    ).subscribe(() => {
      this.toastr.success("Paired with " + device.name);
      this.unmarkBusy(device.macAddress);
      this.refresh();
    });
  }

  protected unpairDevice(device: BluetoothDevice): void {
    this.markBusy(device.macAddress);
    this.api.unpairDevice(device.macAddress).pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to unpair device");
        this.unmarkBusy(device.macAddress);
        return [];
      }),
    ).subscribe(() => {
      this.toastr.success("Removed " + device.name);
      this.unmarkBusy(device.macAddress);
      this.refresh();
    });
  }

  protected isDeviceBusy(mac: string): boolean {
    return this.busyDevices().has(mac);
  }

  protected markBusy(mac: string): void {
    this.busyDevices.update(set => {
      const next = new Set(set);
      next.add(mac);
      return next;
    });
  }

  protected unmarkBusy(mac: string): void {
    this.busyDevices.update(set => {
      const next = new Set(set);
      next.delete(mac);
      return next;
    });
  }

  protected pollScanStatus(): void {
    this.api.getScanStatus().subscribe((status) => {
      const wasScanningBefore = this.scanning();
      this.scanning.set(status.scanning);
      // When scan finishes, refresh the discovered list
      if (wasScanningBefore && !status.scanning) {
        this.refreshDiscovered();
      }
      // While scanning, refresh discovered devices periodically
      if (status.scanning) {
        this.refreshDiscovered();
      }
    });
  }

  protected refreshDiscovered(): void {
    this.api.getDiscoveredDevices().pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to get discovered devices");
        return [];
      }),
    ).subscribe((devices) => this.discoveredDevices.set(devices));
  }

  protected checkRfkill(): void {
    this.api.getRfkillStatus().pipe(
      catchError((_err: HttpErrorResponse) => {
        return [];
      }),
    ).subscribe((status) => this.rfkillStatus.set(status));
  }

  protected unblockRfkill(): void {
    this.rfkillUnblocking.set(true);
    this.api.unblockRfkill().pipe(
      catchError((err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || "Failed to unblock Bluetooth");
        this.rfkillUnblocking.set(false);
        return [];
      }),
    ).subscribe(() => {
      this.rfkillUnblocking.set(false);
      this.toastr.success("Bluetooth unblocked");
      this.checkRfkill();
    });
  }
}
