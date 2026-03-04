import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { BluetoothApiService, BluetoothDevice } from '../../../../core/services/api/bluetooth-api.service';
import { ToastrService } from 'ngx-toastr';
import { Title } from '@angular/platform-browser';

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

  readonly pairedDevices = signal<BluetoothDevice[]>([]);
  readonly discoveredDevices = signal<BluetoothDevice[]>([]);
  readonly scanning = signal<boolean>(false);
  readonly loading = signal<boolean>(true);
  readonly busyDevices = signal<Set<string>>(new Set());

  /**
   * Discovered devices that are NOT already paired — avoids showing duplicates.
   */
  readonly newDevices = computed(() => {
    const pairedMacs = new Set(this.pairedDevices().map(d => d.macAddress));
    return this.discoveredDevices().filter(d => !pairedMacs.has(d.macAddress));
  });

  ngOnInit(): void {
    this.title.setTitle("Bluetooth - Protogen");
    this.refresh();
    this.pollInterval = setInterval(() => this.pollScanStatus(), 2000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval != null) {
      clearInterval(this.pollInterval);
    }
  }

  refresh(): void {
    this.loading.set(true);
    this.api.getPairedDevices().subscribe({
      next: (devices) => {
        this.pairedDevices.set(devices);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.api.getDiscoveredDevices().subscribe({
      next: (devices) => this.discoveredDevices.set(devices),
    });

    this.api.getScanStatus().subscribe({
      next: (status) => this.scanning.set(status.scanning),
    });
  }

  startScan(): void {
    this.scanning.set(true);
    this.api.startScan(15).subscribe({
      next: () => {
        this.toastr.info("Scanning for devices...");
      },
      error: () => this.scanning.set(false),
    });
  }

  stopScan(): void {
    this.api.stopScan().subscribe({
      next: () => {
        this.scanning.set(false);
        this.refreshDiscovered();
      },
    });
  }

  connectDevice(device: BluetoothDevice): void {
    this.markBusy(device.macAddress);
    this.api.connectDevice(device.macAddress).subscribe({
      next: () => {
        this.toastr.success("Connected to " + device.name);
        this.unmarkBusy(device.macAddress);
        this.refresh();
      },
      error: () => this.unmarkBusy(device.macAddress),
    });
  }

  disconnectDevice(device: BluetoothDevice): void {
    this.markBusy(device.macAddress);
    this.api.disconnectDevice(device.macAddress).subscribe({
      next: () => {
        this.toastr.success("Disconnected from " + device.name);
        this.unmarkBusy(device.macAddress);
        this.refresh();
      },
      error: () => this.unmarkBusy(device.macAddress),
    });
  }

  pairDevice(device: BluetoothDevice): void {
    this.markBusy(device.macAddress);
    this.api.pairDevice(device.macAddress).subscribe({
      next: () => {
        this.toastr.success("Paired with " + device.name);
        this.unmarkBusy(device.macAddress);
        this.refresh();
      },
      error: () => this.unmarkBusy(device.macAddress),
    });
  }

  unpairDevice(device: BluetoothDevice): void {
    this.markBusy(device.macAddress);
    this.api.unpairDevice(device.macAddress).subscribe({
      next: () => {
        this.toastr.success("Removed " + device.name);
        this.unmarkBusy(device.macAddress);
        this.refresh();
      },
      error: () => this.unmarkBusy(device.macAddress),
    });
  }

  isDeviceBusy(mac: string): boolean {
    return this.busyDevices().has(mac);
  }

  private markBusy(mac: string): void {
    this.busyDevices.update(set => {
      const next = new Set(set);
      next.add(mac);
      return next;
    });
  }

  private unmarkBusy(mac: string): void {
    this.busyDevices.update(set => {
      const next = new Set(set);
      next.delete(mac);
      return next;
    });
  }

  private pollScanStatus(): void {
    this.api.getScanStatus().subscribe({
      next: (status) => {
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
      },
    });
  }

  private refreshDiscovered(): void {
    this.api.getDiscoveredDevices().subscribe({
      next: (devices) => this.discoveredDevices.set(devices),
    });
  }
}
