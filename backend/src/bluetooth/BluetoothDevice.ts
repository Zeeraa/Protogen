export interface BluetoothDevice {
  macAddress: string;
  name: string;
  paired: boolean;
  connected: boolean;
  trusted: boolean;
}
